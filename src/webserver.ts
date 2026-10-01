import express from "express";
import proxy from "express-http-proxy";
import cors from "cors";
import { activateModule, deactivateModule } from "./index";
import { getActiveModulesForRoomId } from "./duckdb";
import { getRoomEvents, sendMessage, getMediaUrl, getMedia } from "./matrixClientRequests";
import { RoomResult } from "../types";

const { userId } = process.env;

export default async function startWebServer(modules) {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cors())
    const routes = [
        "/",
        "/chat",
        "/conversations",
        "/faq",
        "/privacy",
        "/volunteer",
        "/motivations",
    ]
    routes.forEach(route => {
        app.use(route, express.static("web/dist"));
    })

    modules.forEach(module => {
        app.use(`/${module.id}`, proxy(module.url, {
            proxyReqPathResolver: req => req.url
        }));
    })

    app.get("/api/registrations", async (req, res) => {
        const safeModuleList = modules.map(module => ({
            id: module.id,
            url: module.url,
            emoji: module.emoji,
            introduction: module.introduction,
            title: module.title,
            description: module.description,
            event_types: module.event_types
        }));

        res.send(safeModuleList);
    })

    app.get("/api/tools", async (req, res) => {
        const { roomId } = req.query;

        const moduleActivations = await getActiveModulesForRoomId(roomId as string);
        const activeModules = moduleActivations.map(module => module.module_id);
        const tools = modules.map(module => ({ ...module, active: activeModules.includes(module.id) }))

        res.send(tools);
    })

    app.get("/api/room", async (req, res) => {
        const { roomId } = req.query;

        const roomResponse = await getRoomEvents(roomId as string);
        const roomResult = await roomResponse.json() as RoomResult;

        const namingEvent = roomResult.chunk.find(event => event.type === "m.room.name");

        const room = {
            timeline: roomResult.chunk,
            id: roomId,
            title: namingEvent.content.name,
            botId: userId
        }

        res.send(room);
    })

    app.post("/api/tools", async (req, res) => {
        const { roomId } = req.query;
        const { toolId, activation } = req.body;

        const module = modules.find(module => module.id === toolId);

        if (activation) {
            await activateModule(roomId, module, "dashboard.user");
        }
        else {
            await deactivateModule(roomId, module);
        }

        res.send({ success: true });
    })

    app.post("/api/send", async (req, res) => {
        const { roomId, toolId, secret } = req.query;
        const { message } = req.body;

        const module = modules.find(module => module.id === toolId);

        if (!module) {
            res.send({ success: false, message: "no module found with id" });
        }

        if (!module.secret || module.secret !== secret) {
            res.send({ success: false, message: "secret does not match registered secret" });
        }

        const activeModules = await getActiveModulesForRoomId(roomId as string);

        if (activeModules.find(activeModule => activeModule.module_id === module.id)) {
            sendMessage(roomId as string, message);
            res.send({ success: true });
        }
        else {
            res.send({ success: false, message: "module is not active in this room" })
        }
    })

    app.get("/api/content", async (req, res) => {
        const { mxcUrl } = req.query;

        const url = await getMediaUrl(mxcUrl as string);

        try {
            const upstream = await getMedia(url);

            if (!upstream.ok) {
                return res.sendStatus(upstream.status === 404 ? 404 : 502);
            }

            res.type(upstream.headers.get("content-type") ?? "audio/mpeg");
            res.send(Buffer.from(await upstream.arrayBuffer()));
        } catch (err) {
            console.error("Media fetch failed", err);
            res.sendStatus(502);
        }
    })

    app.listen(8138);
}