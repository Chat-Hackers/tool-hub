import { DuckDBConnection, DuckDBInstance } from "@duckdb/node-api";
import path from "node:path";

let connection: DuckDBConnection;
let instance: DuckDBInstance;

export async function startDuckDB() {
    const chatHackersDuckDBFileName = "chathackers_duckdb.db";

    const dataDir = process.env.DUCKDB_DATA_DIR ?? path.resolve(__dirname, "../..");
    const dbPath = path.join(dataDir, chatHackersDuckDBFileName);

    instance = await DuckDBInstance.create(dbPath);
    connection = await instance.connect();

    const tables = [
        {
            name: "ModuleActivations",
            creationCommand:
                "CREATE TABLE ModuleActivations (module_id VARCHAR, room_id VARCHAR, active BOOLEAN, created_by_user_id VARCHAR);",
        },
        {
            name: "ToolUseSettings",
            creationCommand:
                "CREATE TABLE ToolUseSettings (room_id VARCHAR, admin_only BOOLEAN);"
        },
        {
            name: "AdminTokens",
            creationCommand:
                "CREATE TABEL AdminTokens (room_id VARCHAR, admin_token: VARCHAR);"
        }
    ]

    const existingTablesRows = await connection.run("SHOW TABLES;");
    const existingTables = await existingTablesRows.getRowObjects();

    tables.forEach(async (table) => {
        const tableExists = existingTables.filter((existingTable) => existingTable.name === table.name).length > 0;

        if (tableExists) {
            console.log(`${table.name} already exists`);
        } else {
            await connection.run(table.creationCommand);
            console.log(`${table.name} created`);
        }
    });
}

export async function getActiveModulesForRoomId(roomId: string) {
    const getActiveModules = `SELECT * FROM ModuleActivations WHERE room_id='${roomId}' AND active=true;`;
    const activeModuleRows = await connection.run(getActiveModules);
    const activeModules = await activeModuleRows.getRowObjects();
    return activeModules;
}

export async function insertActiveModule(moduleId, roomId, userId) {
    const insertActiveModule = `INSERT INTO ModuleActivations VALUES ('${moduleId}', '${roomId}', 'TRUE', '${userId}');`;
    await connection.run(insertActiveModule);
}

export async function updateModuleActivation(moduleId, roomId, active) {
    const updateModuleActivation = `UPDATE ModuleActivations SET active=${active ? 'TRUE' : 'FALSE'} WHERE module_id='${moduleId}' AND room_id='${roomId}';`;
    await connection.run(updateModuleActivation);
}

export async function insertToolUseSetting(roomId: string, adminOnly: boolean) {
    const insertToolUseSetting = `INSERT INTO ToolUseSettings VALUES ($1, $2);`;
    const prepared = await connection.prepare(insertToolUseSetting);
    prepared.bindVarchar(1, roomId);
    prepared.bindBoolean(2, adminOnly);
    await prepared.run();
}

export async function getToolUseSetting(roomId: string) {
    const selectToolUseSetting = `SELECT FROM ToolUseSettings WHERE room_id=$1;`;
    const prepared = await connection.prepare(selectToolUseSetting);
    prepared.bindVarchar(1, roomId);
    const toolUseSettingsRows = await prepared.run();
    const toolUseSettings = await toolUseSettingsRows.getRowObjects();
    return toolUseSettings;
}

export async function deleteToolUseSettings(roomId: string) {
    const deleteToolUseSettings = `DELETE ToolUseSettings WHERE room_id=$1;`;
    const prepared = await connection.prepare(deleteToolUseSettings);
    prepared.bindVarchar(1, roomId);
    await prepared.run();
}

export async function insertAdminToken(roomId: string, token: string) {
    const insertAdminToken = `INSERT INTO AdminTokens VALUES ($1, $2);`;
    const prepared = await connection.prepare(insertAdminToken);
    prepared.bindVarchar(1, roomId);
    prepared.bindVarchar(2, token);
    await prepared.run();
}

export async function getAdminTokens(roomId: string) {
    const selectAdminTokens = `SELECT * FROM AdminTokens WHERE room_id=$1;`;
    const prepared = await connection.prepare(selectAdminTokens);
    prepared.bindVarchar(1, roomId);
    const adminTokensRows = await prepared.run();
    const adminTokens = await adminTokensRows.getRowObjects();
    return adminTokens;
}

process.on("SIGINT", () => {
    connection.closeSync();       // disconnect the connection
    instance.closeSync();   // release the file lock
    process.exit(0);
});

process.on("SIGTERM", () => {
    connection.closeSync();
    instance.closeSync();
    process.exit(0);
});