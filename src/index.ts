import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { login, getEvent, getSync, joinRoom, sendMessage, sendEvent, getProfile, createDirectMessageRoom, updateAccountData, getMediaUrl, getPowerLevels } from "./matrixClientRequests";
import { MatrixEvent, ChatTool, Profile, ToolUseSetting } from "../types";
import { startDuckDB, getActiveModulesForRoomId, insertActiveModule, updateModuleActivation, insertToolUseSetting, deleteToolUseSettings, getToolUseSetting, insertAdminToken } from "./duckdb";
import startWebServer from "./webserver";

const { userId, dashboard_url } = process.env;

const scriptStart = Date.now();
const handledEventIds: string[] = [];
const modules: ChatTool[] = [];

async function getDisplayName(event) {
    const profile = await getProfile(event.sender) as Profile;
    return profile.displayname;
}

async function checkAdmin(roomId: string, userId: string): Promise<boolean> {
    const ADMIN_POWER_LEVEL = 50;

    try {
        const res = await getPowerLevels(roomId);
        if (!res.ok) return false;

        const content = (await res.json()) as { users?: { [key: string]: number }, users_default: number };
        const level = content.users?.[userId] ?? content.users_default ?? 0;

        return level >= ADMIN_POWER_LEVEL;
    } catch (err) {
        console.error(`Failed to check admin status for ${userId} in ${roomId}:`, err);
        return false;
    }
}

async function forwardEvent(module, event) {
    const displayName = await getDisplayName(event);

    const response = await fetch(module.url, {
        method: "POST",
        body: JSON.stringify({ event, botUserId: userId, displayName }),
        headers: {
            "Content-type": "application/json"
        }
    }).catch(err => console.log(err));

    if (response) {
        const result = await response.json();
        return result;
    } else
        return { success: false, message: "network error" }
}

export async function activateModule(roomId, module, sender) {
    const moduleActivations = await getActiveModulesForRoomId(roomId);
    const moduleActive = moduleActivations.find(moduleActivation => moduleActivation.module_id === module.id);

    if (!moduleActive) {
        await insertActiveModule(module.id, roomId, sender);
        sendMessage(roomId, `Turning on ${module.title}. ${module.introduction}`, {
            moduleEvent: false,
            wrapperEvent: true,
        });
    } else {
        sendMessage(roomId, `${module.title} is already active. ${module.introduction}`, {
            moduleEvent: false,
            wrapperEvent: true,
        });
    }
}

export async function deactivateModule(roomId, module) {
    const moduleActivations = await getActiveModulesForRoomId(roomId);
    const moduleActive = moduleActivations.find(moduleActivation => moduleActivation.module_id === module.id);

    if (moduleActive) {
        await updateModuleActivation(moduleActive.module_id, moduleActive.room_id, false);
        sendMessage(roomId, `${module.title} has been deactivated.`, {
            moduleEvent: false,
            wrapperEvent: true,
        });
    }
    else {
        sendMessage(roomId, `${module.title} has already been deactivated.`, {
            moduleEvent: false,
            wrapperEvent: true,
        });
    }
}

async function sendWrapperOpener(event) {
    const roomId = event.room_id;

    const moduleActivations = await getActiveModulesForRoomId(roomId);

    await sendMessage(roomId, "Here are the available tools for this room. Use the ❤️ react to add a tool and the 🙏 react to remove a tool. Use the 👀 react to get a link to the dashboard.", {
        moduleEvent: false,
        wrapperEvent: true
    })

    modules.forEach(module => {
        const moduleActive = moduleActivations.find(moduleActivation => moduleActivation.module_id === module.id);
        const moduleMessage = `${module.emoji} ${module.title} - ${module.description} ${moduleActive ? "- Added" : ""}`;

        sendMessage(roomId, moduleMessage, {
            moduleEvent: false,
            wrapperEvent: true,
            moduleId: module.id
        })
    })
    return;
}

async function handleWrapperEvent(event: MatrixEvent) {
    console.log("wrapper event", event)

    const roomId = event.room_id;
    const emoji = event.content?.["m.relates_to"]?.key;
    const { context } = event.prevEvent.content;

    if (!emoji)
        return;

    if (emoji.includes("⚙️")) {
        await sendWrapperOpener(event);
        return;
    }

    if (emoji.includes("👀")) {
        await sendMessage(roomId, `Your dashboard can be found at ${dashboard_url}/chat?roomId=${roomId}`, {
            moduleEvent: false,
            wrapperEvent: true,
        })
        return;
    }

    if (emoji.includes("🔒")) {
        await deleteToolUseSettings(roomId);
        await insertToolUseSetting(roomId, true);
        await sendMessage(roomId, `Chat Hackers is now admin-only. Add an unlock (🔓) react to enable all users`, {
            moduleEvent: false,
            wrapperEvent: true,
        })
        return;
    }

    if (emoji.includes("🔓")) {
        await deleteToolUseSettings(roomId);
        await insertToolUseSetting(roomId, false);
        await sendMessage(roomId, `Chat Hackers can be used by all users. Add a lock (🔒) react to make admin-only`, {
            moduleEvent: false,
            wrapperEvent: true,
        })
        return;
    }

    if (context.newAdminCode && emoji.includes("❤️")) {
        const isAdmin = await checkAdmin(roomId, event.sender);
        if (isAdmin) {
            await insertAdminToken(roomId, context.newAdminCode);
            sendMessage(roomId, `Access has been granted to this session`);
        }
        return;
    }

    const module = modules.find(possibleModule => possibleModule.id === context.moduleId);
    if (!module) {
        sendMessage(roomId, "Sorry, this message has no interactive component.", {
            moduleEvent: false,
            wrapperEvent: true,
        })
        return;
    }

    if (emoji.includes("❤️")) {
        await activateModule(roomId, module, event.sender);
        return;
    }

    if (emoji.includes("🙏")) {
        await deactivateModule(roomId, module);
        return;
    }
}

let directRooms: { [key: string]: string[] } = {};

async function getDirectRoom(recipient: string) {
    if (directRooms[recipient])
        return directRooms[recipient][0];

    const roomCreationResponse = await createDirectMessageRoom(recipient);
    const { room_id } = await roomCreationResponse.json() as { room_id: string };
    updateAccountData(recipient, room_id)

    return room_id;
}

async function handleToolResponse(roomId: string, response: any) {
    if (typeof (response) === "string") {
        sendMessage(roomId, response, {
            moduleEvent: true,
            wrapperEvent: false
        });
        return;
    }

    if (response.message) {
        const recipient = response.recipient;
        const destination = recipient ? await getDirectRoom(recipient) : roomId;
        sendMessage(destination, response.message, {
            moduleEvent: true,
            wrapperEvent: false,
            ...response.context
        });
        return;
    }

    if (response[0] && response[0].message) {
        response.forEach(async response => {
            const recipient = response.recipient;
            const destination = recipient ? await getDirectRoom(recipient) : roomId;
            sendMessage(destination, response.message, {
                moduleEvent: true,
                wrapperEvent: false,
                ...response.context
            })
        })
        return;
    }
}

async function handleToolEvent(event: MatrixEvent) {
    const toolActivations = await getActiveModulesForRoomId(event.room_id);

    modules
        .filter(tool => toolActivations.find(toolActivation => toolActivation.module_id === tool.id))
        .forEach(async (tool) => {
            if (tool.event_types.passive?.includes(event.type)) {
                console.log(`passive event sent to ${tool.id}`, event)
                const forwardResult: any = await forwardEvent(tool, event);
                console.log(`forward result from ${tool.id}: `, forwardResult)

                if (forwardResult && forwardResult.response) {
                    handleToolResponse(event.room_id, forwardResult.response);
                }
            }
            if (tool.event_types.active?.includes(event.type)) {
                const toolUseSetting = (await getToolUseSetting(event.room_id)) as ToolUseSetting;
                if (toolUseSetting && toolUseSetting.admin_only) {
                    const isAdmin = await checkAdmin(event.room_id, event.sender)
                    if (!isAdmin)
                        return;
                }

                console.log(`active event sent to ${tool.id}`, event)
                const forwardResult: any = await forwardEvent(tool, event);
                console.log(`forward result from ${tool.id}: `, forwardResult)

                if (forwardResult && forwardResult.response) {
                    handleToolResponse(event.room_id, forwardResult.response);
                }
            }
        }
        )
}

async function loadTools() {
    const registrationPath = path.resolve("./registrations");
    const registrationFiles = fs.readdirSync(registrationPath);

    registrationFiles.forEach(fileName => {
        const filePath = path.resolve(`./registrations/${fileName}`);
        const registrationBuffer = fs.readFileSync(filePath);
        let registration;
        try {
            registration = JSON.parse(registrationBuffer.toString());
        }
        catch (err) {
            console.log(fileName, err)
        }

        modules.push(registration);
    })
}

async function sync(batch = null) {
    let result: any;

    try {
        result = await getSync(batch);
    }
    catch (err) {
        console.log("sync failed, retrying in 5s:", (err as Error).message);
        setTimeout(() => sync(batch), 5000);
        return;
    }

    if (result.account_data && result.account_data.events) {
        const directRoomEvent = result.account_data.events.find(event => event.type === "m.direct");
        if (directRoomEvent && directRoomEvent.content) {
            for (const userId in directRoomEvent.content) {
                directRooms[userId] = directRoomEvent.content[userId];
            }
        }
    }

    // joining new rooms
    if (result.rooms && result.rooms.invite) {
        for (const roomId in result.rooms.invite) {
            await joinRoom(roomId);
            await sendMessage(roomId, `Hello and welcome to Chat Hackers! 
                Send a Gear emoji (⚙️) to see your tool options. 
                Add an eyes (👀) react to this message to 
                get a dashboard link.`, {
                moduleEvent: false,
                wrapperEvent: true
            })
            await sendMessage(roomId, `To make tools and the dashboard admin-only, 
                add a lock (🔒) react to this message`, {
                moduleEvent: false,
                wrapperEvent: true
            })
        }
    }

    if (result.rooms && result.rooms.join) {
        for (const roomId in result.rooms.join) {
            const room = result.rooms.join[roomId];
            const timeline: MatrixEvent[] = room.timeline?.events ?? [];
            timeline.forEach(async event => {
                if (!handledEventIds.includes(event.event_id) && event.origin_server_ts > scriptStart && event.sender !== userId) {
                    if (event.content && event.content.body && event.content.body.includes("!wa accept")) {
                        const replyEvent = {
                            body: "!wa accept",
                            "m.mentions": { user_ids: [event.sender] },
                            user_ids: [event.sender],
                            "m.relates_to": {
                                "m.in_reply_to": { event_id: event.event_id }
                            },
                            "m.in_reply_to": { event_id: event.event_id },
                            msgtype: "m.text"
                        }
                        sendEvent(roomId, replyEvent, "m.room.message")
                        return;
                    }

                    event.room_id = roomId;
                    if (event.content["m.relates_to"]) {
                        const prevEventId = event.content["m.relates_to"].event_id || event.content["m.relates_to"]["m.in_reply_to"].event_id;
                        const prevEvent = await getEvent(roomId, prevEventId);
                        event.prevEvent = prevEvent;
                    }

                    const profile = await getProfile(event.sender) as Profile;
                    event.displayname = profile.displayname;

                    if (event.type === "m.room.message" && event.content.body.includes("⚙️"))
                        sendWrapperOpener(event);

                    if (event.prevEvent &&
                        event.prevEvent.content.context &&
                        event.prevEvent.content.context.wrapperEvent &&
                        event.prevEvent.sender === userId)
                        handleWrapperEvent(event);
                    else
                        handleToolEvent(event);

                    handledEventIds.push(event.event_id);
                }
            })
        }
    }

    sync(result.next_batch);
}

const start = async () => {
    await startDuckDB();

    // load modules
    await loadTools();

    // start matrix session
    await login();

    // start listening for events
    sync();

    //start web server
    startWebServer(modules);
};

start().catch((err) => {
    console.error("Error starting client:", err);
});
