import * as fs from "fs";

export interface ApplicationConfig {
    firmwareLocalStoragePath: fs.PathLike;
    firmwareFileNameWithoutVersion: string;
    remoteFirmwareStorageServer: RemoteFirmwareStorageServerConfig;
    systemdFirmwareServiceConfigurationFilePath: fs.PathLike;
}

export interface RemoteFirmwareStorageServerConfig {
    hostname: string;
    port: number;
    path: string;
}
