export type MatrixEvent = {
    type: string;
    event_id: string;
    content: any;
    sender: string;
    origin_server_ts: number;
    room_id: string;
    prevEvent?: any;
    state_key?: string;
    displayname?: string;
};

export type ChatModule = {
    id: string;
    url: string;
    emoji: string;
    introduction: string;
    title: string;
    description: string;
    event_types: string[];
    secret?: string;
}

export type Tool = ChatModule & {
    active: boolean;
}

export type Room = {
    title: string;
    id: string;
    timeline: MatrixEvent[]
}

export type RoomResult = {
    chunk: MatrixEvent[];
}

export type Profile = {
    displayname: string;
    avatar_url: string;
}