import * as fs from "fs";
import * as http from "http";
import * as child_process from "child_process";
import * as raw_config from "../config.json";
import { ApplicationConfig } from "./config-interfaces";

function extractSystemdServiceNameFromConfigFilePath(configFilePath: fs.PathLike): string {
    const systemdServiceConfigFileExtension: string = ".service";
    const configFilePathWithoutEntension = configFilePath
        .toString()
        .replace(systemdServiceConfigFileExtension, "");
    const indexOfLastSlash = configFilePathWithoutEntension.lastIndexOf("/", undefined);
    return configFilePathWithoutEntension.slice(
        indexOfLastSlash + 1,
        configFilePathWithoutEntension.length,
    );
}

async function run(): Promise<void> {
    const config: ApplicationConfig = raw_config as ApplicationConfig;
    const firmwareFileNameRegex: RegExp = new RegExp(
        `(${config.firmwareFileNameWithoutVersion}{1})(\\d{1,999})`,
        undefined,
    );
    const bufferEncoding: BufferEncoding = "utf-8";

    const directoryFilteredEntries = fs
        .readdirSync(config.firmwareLocalStoragePath, bufferEncoding)
        .filter((fileName: string, _index: number, _array: string[]) => {
            return firmwareFileNameRegex.test(fileName);
        }, undefined);

    if (directoryFilteredEntries.length > 1 || directoryFilteredEntries.length == 0) {
        throw new Error(
            `Expected to have one file that matches regex, currently have: ${directoryFilteredEntries.length}`,
        );
    } else {
        console.log(`Firmware file successfully found: ${directoryFilteredEntries[0]}`);
    }

    const currentFirmwareFileVersion: number = parseInt(
        directoryFilteredEntries[0].replace(config.firmwareFileNameWithoutVersion, ""),
    );
    const nextFirmwareFileVersion: number = currentFirmwareFileVersion + 1;
    const httpRequestOptions: http.RequestOptions = {
        hostname: config.remoteFirmwareStorageServer.hostname,
        port: config.remoteFirmwareStorageServer.port,
        path: `${config.remoteFirmwareStorageServer.path}${config.firmwareFileNameWithoutVersion}${nextFirmwareFileVersion}`,
        method: "GET",
    };

    console.log(`Checking remote server for next firmware version: ${nextFirmwareFileVersion}`);

    const httpRequest = http.request(httpRequestOptions, (incoming: http.IncomingMessage) => {
        if (incoming.statusCode != 200) {
            console.log("New version of firmware wasn`t found");
            return;
        }

        console.log("New version of firmware was found, starting download...");

        // prettier-ignore
        const nextVersionFirmwareFilePath: fs.PathLike =
            `${config.firmwareLocalStoragePath}${config.firmwareFileNameWithoutVersion}${nextFirmwareFileVersion}`;

        fs.appendFileSync(nextVersionFirmwareFilePath, "", bufferEncoding);
        child_process.execSync(`chmod 777 ${nextVersionFirmwareFilePath}`);

        const nextVersionFirmwareFileWriteStream = fs.createWriteStream(
            nextVersionFirmwareFilePath,
            bufferEncoding,
        );

        incoming.pipe(nextVersionFirmwareFileWriteStream);

        nextVersionFirmwareFileWriteStream.on("finish", () => {
            nextVersionFirmwareFileWriteStream.close();

            console.log("New version of firmware was successfully written");

            const systemdFirmwareServiceName = extractSystemdServiceNameFromConfigFilePath(
                config.systemdFirmwareServiceConfigurationFilePath,
            );
            child_process.execSync(`systemctl stop ${systemdFirmwareServiceName}`);

            console.log(`Current firmware process successfully stopped`);

            // prettier-ignore
            const currentVersionFirmwareFilePath: fs.PathLike =
                `${config.firmwareLocalStoragePath}${config.firmwareFileNameWithoutVersion}${currentFirmwareFileVersion}`;
            const systemdFirmwareServiceConfigurationFileNewContent: string = fs
                .readFileSync(
                    config.systemdFirmwareServiceConfigurationFilePath,
                    bufferEncoding,
                )
                .toString()
                .replace(currentVersionFirmwareFilePath, nextVersionFirmwareFilePath);

            fs.truncateSync(config.systemdFirmwareServiceConfigurationFilePath);
            fs.writeFileSync(
                config.systemdFirmwareServiceConfigurationFilePath,
                systemdFirmwareServiceConfigurationFileNewContent,
                bufferEncoding,
            );

            console.log("Systemd service configuration file successfully rewritten");

            child_process.execSync(`systemctl start ${systemdFirmwareServiceName}`);

            console.log(`New firmware version currently running`);

            fs.unlinkSync(currentVersionFirmwareFilePath);

            console.log("Previous firmware file was successfully unlinked");
            return;
        });

        incoming.socket.end(undefined);
        return;
    });

    httpRequest.end(undefined);
}

run().catch((err: any) => {
    console.error(err);
});
