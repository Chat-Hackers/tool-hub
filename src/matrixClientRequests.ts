const { access_token, homeserver, userId } = process.env;

export const getSync = async (batch: string | null) => {
  const syncResponse = await fetch(`${homeserver}/_matrix/client/v3/sync?timeout=30000${batch ? `&since=${batch}` : ""}`, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  })

  if (!syncResponse.ok) {
    const errorBody = await syncResponse.json().catch(() => null);
    throw new Error(
      `Matrix sync failed: ${syncResponse.status} ${errorBody}`
    )
  }

  const syncResult = await syncResponse.json();

  return syncResult;
}

export const sendEvent = (roomId: string, content: any, type: string) => {
  return fetch(`${homeserver}/_matrix/client/v3/rooms/${roomId}/send/${type}`, {
    method: "POST",
    body: JSON.stringify(content),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
  });
};

export const sendMessage = (roomId: string, message: string, context = {}) => {
  return sendEvent(
    roomId,
    {
      body: message,
      msgtype: "m.text",
      context,
    },
    "m.room.message"
  );
};

export const getEvent = async (roomId: string, eventId: string) => {
  const response = await fetch(
    `${homeserver}/_matrix/client/v3/rooms/${roomId}/event/${eventId}`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    }
  );
  return response.json();
};

export const getRoomEvents = (roomId: string) => {
  return fetch(
    `${homeserver}/_matrix/client/v3/rooms/${roomId}/messages?limit=10000&dir=b`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
    }
  );
};

export const redactEvent = async (
  roomId: string,
  eventId: string,
  redactionReason: string
) => {
  const txn = Date.now();

  return fetch(
    `${homeserver}/_matrix/client/v3/rooms/${roomId}/redact/${eventId}/${txn}`,
    {
      method: "PUT",
      body: JSON.stringify({
        reason: redactionReason,
      }),
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    }
  );
};

export const joinRoom = async (roomId: string) => {
  return fetch(
    `${homeserver}/_matrix/client/v3/rooms/${roomId}/join`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    }
  );
}

export async function createDirectMessageRoom(userId: string) {
  return fetch(`${homeserver}/_matrix/client/v3/createRoom`, {
    method: "POST",
    body: JSON.stringify({
      "is_direct": true,
      "invite": [
        userId
      ],
      "preset": "trusted_private_chat",
      "name": ""
    }),
    headers: {
      Authorization: `Bearer ${access_token}`,
    }
  })
}

export async function updateAccountData(directUserId: string, roomId: string) {
  return fetch(`${homeserver}/_matrix/client/v3/user/${userId}/account_data/m.direct`, {
    method: "PUT",
    body: JSON.stringify({
      [directUserId]: [
        roomId
      ]
    }),
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  })
}

export const getProfile = async (userId: string) => {
  const response = await fetch(`${homeserver}/_matrix/client/v3/profile/${userId}`, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
  const profile = await response.json()
  return profile;
};