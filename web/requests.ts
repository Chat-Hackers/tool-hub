const { VITE_BASE_URL } = import.meta.env;

export async function getTools(roomId: string) {
    const toolsResponse = await fetch(`${VITE_BASE_URL}/api/tools?roomId=${roomId}`);
    const toolsResult = await toolsResponse.json();

    return toolsResult;
}

export async function getRoom(roomId: string) {
    const roomResponse = await fetch(`${VITE_BASE_URL}/api/room?roomId=${roomId}`);
    const roomResult = await roomResponse.json();

    return roomResult;
}

export async function postToolActivation(roomId: string, toolId: string, activation: boolean) {
    return fetch(`${VITE_BASE_URL}/api/tools?roomId=${roomId}`, {
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