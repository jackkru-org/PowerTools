import { Command } from '@oclif/core';
import {
  AddressApi,
  ChainNameEnum,
  EvmApi,
} from '@thepowereco/tssdk';

import ux from 'cli-ux';
import * as Listr from 'listr';
import { resolve } from 'path';
import { color } from '@oclif/color';
import { getHash } from '../../helpers/calcHash.helper';
import { uploadTaskManifest, uploadTaskFile, scanDir } from '../../helpers/upload.helper';
import { getConfig, setConfig } from '../../helpers/config.helper';
import { CliConfig } from '../../types/cliConfig.type';
import * as abiJson from '../../config/scStorageAbi.json';
import { storageScAddress } from '../../config/cli.config';

export default class Upload extends Command {
  static description = 'Upload application files to storage';

  static examples = [
    '$ cd app_dir && pow-up',
  ];

  static flags = {
    // path: Flags.string({char: 'p', description: 'The path of directory to upload', required: false}),
    // wif: Flags.string({char: 'w', description: 'private key (wif)', required: true}),
    // address: Flags.string({char: 'a', description: 'your address', required: true}),
    // projectId: Flags.string({char: 'i', description: 'ID of yur project', required: true}),
  };

  static args = [];

  async run(): Promise<void> { // TODO: update task
    this.log(color.whiteBright('✋️WELCOME TO THE POWER ECOSYSTEM! 💪 🌍'));

    let config: CliConfig = await getConfig();

    if (!config) { // TODO: smart prompt
      const source = await ux.prompt('Please, enter the source path of your project, ex. "./dist")');
      await ux.confirm(`Source path = "${resolve(source)}". Continue? (yes/no)`);

      const projectId = await ux.prompt('Please, enter your project id (must be unique in list of your projects)');
      const address = await ux.prompt('Please, enter your account address, ex. "AA030000174483048139"');
      const wif = await ux.prompt('Please, enter your account private key (wif)', { type: 'hide' });

      config = {
        source, projectId, address, wif,
      };
      await setConfig(config);
    }

    this.log(color.whiteBright('Current cli config:'));

    this.log(color.cyan(JSON.stringify(config, null, 2)));

    const {
      source, projectId, address, wif,
    } = config;

    const dir = resolve(source);
    const storageSc = await EvmApi.build(storageScAddress, ChainNameEnum.first, abiJson.abi);
    let taskId = await storageSc.scGet(
      'taskIdByName',
      [AddressApi.textAddressToEvmAddress(address), projectId],
    );

    const files = await scanDir(dir, dir);
    const manifestJsonString = JSON.stringify(files, null, 2);
    const manifestHash = getHash(manifestJsonString);
    const expire = 60 * 60 * 24 * 30; // one month
    const totalSize = files.reduce((size, file) => file.size + size, 0);
    this.log('totalSize =', totalSize);

    if (taskId.toString() === '0') { // task does not exist, need creata
      await storageSc.scSet(
        { address, wif },
        'addTask',
        [projectId, manifestHash, expire, totalSize],
        1, // TODO: change to normal amount
      );

      taskId = await storageSc.scGet(
        'taskIdByName',
        [AddressApi.textAddressToEvmAddress(address), projectId],
      );
    } else { // task exists, need update
      const updateResp = await storageSc.scSet(
        { address, wif },
        'updateTask',
        [taskId.toString(), manifestHash, expire, totalSize],
        1, // TODO: change to normal amount
      );

      console.log(updateResp);
    }

    const taskInfo = await storageSc.scGet(
      'getTask',
      [taskId.toString()],
    );

    console.log(taskInfo);
    console.log(taskInfo.size.toString());

    return;

    const { uploadUrl, baseUrls } = await storageSc.scGet(
      'getProvider',
      [taskInfo.uploader.toString()],
    );

    // upload manifest
    await uploadTaskManifest(uploadUrl, taskId.toString(), manifestJsonString);

    // upload project files
    const uploadTasks = new Listr(
      files.map((file) => (
        {
          title: color.whiteBright(`Uploading ${file.name}, size: ${file.size} bytes`),
          task: async () => {
            await uploadTaskFile(uploadUrl, taskId.toString(), `${source}/${file.path}`, file.name);
          },
        }
      )),
    );

    await uploadTasks.run();

    this.log(`Upload completed, please visit ${baseUrls}${address}/${projectId} to check it.`);
  }
}
