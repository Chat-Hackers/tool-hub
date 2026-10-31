import { Temporal } from "@js-temporal/polyfill";

const { VITE_HUB_URL } = import.meta.env;

export async function getToolUseSetting(roomId: string) {
    const toolUseResponse = await fetch(`${VITE_HUB_URL}/api/tooluse?roomId=${roomId}`);
    const toolUseResult = await toolUseResponse.json();

    return toolUseResult;
}

export async function getTools(roomId: string) {
    const toolsResponse = await fetch(`${VITE_HUB_URL}/api/tools?roomId=${roomId}`);
    const toolsResult = await toolsResponse.json();

    return toolsResult;
}

export async function getRoom(roomId: string) {
    const roomResponse = await fetch(`${VITE_HUB_URL}/api/room?roomId=${roomId}`);
    const roomResult = await roomResponse.json();

    return roomResult;
}

export async function postToolActivation(roomId: string, toolId: string, activation: boolean) {
    return fetch(`${VITE_HUB_URL}/api/tools?roomId=${roomId}`, {
        method: "POST",
        body: JSON.stringify({
            toolId,
            activation
        }),
        headers: {
            "Content-type": "application/json"
        }
    })
}

export async function postNewAdminCode(roomId: string, newAdminCode: string) {
    return fetch(`${VITE_HUB_URL}/api/admincode`, {
        method: "POST",
        body: JSON.stringify({
            roomId,
            newAdminCode
        }),
        headers: {
            "Content-type": "application/json"
        }
    })
}

export async function checkCode(roomId: string, adminCode: string) {
    const checkResponse = await fetch(`${VITE_HUB_URL}/api/admincode?roomId=${roomId}&adminCode=${adminCode}`)
    const checkResult = await checkResponse.json();

    return checkResult.success;
}

export function getContentUrl(mxcUrl: string) {
    return `${VITE_HUB_URL}/api/content?mxcUrl=${mxcUrl}`
}

export async function getRoomEvents(roomId: string, since: Temporal.Instant) {
    const eventsResponse = await fetch(`${VITE_HUB_URL}/api/room/history?roomId=${roomId}&since=${since.toString()}`);
    const events = await eventsResponse.json();
    return events;
}