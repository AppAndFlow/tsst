#!/usr/bin/env node
import program from 'commander';
import fs from 'fs-extra';
import { command } from 'execa';
import fetch from 'node-fetch';
const readline = require('readline');

let localTypePath = './src/sharedTypes';
const configPath = `${localTypePath}/sharedTypes.json`;
const tmpPath = '.tmp';
let tmpTypePath = `./.tmp/${localTypePath}`;
const gitPath = '.git';
const gitPathTmp = '.gitTmp';
const remoteOriginName = 'sharedTypes';

let globalUsername = '';

program
  .version('0.0.1')
  .usage('[options] <action>')
  .arguments('<action>')
  .action(main)
  .parse(process.argv);

function createQuestion(q: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(q + '\n', (answer: any) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main(action: string) {
  if (action === 'init') {
    await init();
  } else if (action === 'sync') {
    const username = await createQuestion('What is your github username ?');
    globalUsername = username;
    await updateTypes();
  } else {
    console.error('Invalid action. Please enter "init" or "sync".');
    process.exit(1);
  }
}

async function init() {
  let typesRepoURL = '';

  const exist = await fs.pathExists(localTypePath);

  if (exist) {
    console.log(
      `Folder ${localTypePath} already existing. It seems that this project is already initialized with ts-sharedTypes.`,
    );
    process.exit(1);
  }

  const res = await createQuestion(
    'Hello! Would you like ts-sharedTypes to create a remote repo for you where your types will be save ? (y/n)',
  );

  const username = await createQuestion('What is your github username ?');
  globalUsername = username;

  const shouldCreateRepo = res.toLowerCase().includes('y');

  if (shouldCreateRepo) {
    const name = await createQuestion('What is your project name ?');

    const editedLocalTypePath = await createQuestion(
      `Would you like to change the sharedTypes directory ? Leave empty to use the default one: "${localTypePath}"`,
    );

    if (editedLocalTypePath.length) {
      localTypePath = editedLocalTypePath;
    }

    const githubToken = await createQuestion(
      'In order to init the type repo for you, ts-sharedTypes needs a github access token. Please paste one here: ',
    );

    const orgName = await createQuestion(
      'Is this repo part of an organisation ? If yes, write the organisation name here or leave empty otherwise: ',
    );

    if (orgName.length) {
      const response = await fetch(
        `https://api.github.com/orgs/${orgName}/repos`,
        {
          method: 'POST',
          headers: {
            Authorization: `token ${githubToken}`,
          },
          body: JSON.stringify({
            name: `${name}-sharedTypes`,
            description: `Contains shared typescript types of the project ${name}`,
            private: true,
            auto_init: true,
          }),
        },
      ).then((r) => r.json());

      console.log('Creating repo on github..');

      if (!response.clone_url) {
        console.log('Error while creating your remote type repo.');
        console.error(response);
        process.exit(1);
      }
      typesRepoURL = response.clone_url;
    } else {
      console.log('Creating repo on github..');

      const response = await fetch(`https://api.github.com/user/repos`, {
        method: 'POST',
        headers: {
          Authorization: `token ${githubToken}`,
        },
        body: JSON.stringify({
          name: `${name}-sharedTypes`,
          description: `Contains shared typescript types of the project ${name}`,
          private: true,
          auto_init: true,
        }),
      }).then((r) => r.json());

      if (!response.clone_url) {
        console.log('Error while creating your remote type repo.');
        console.error(response);
        process.exit(1);
      }

      typesRepoURL = response.clone_url;
    }
  } else {
    typesRepoURL = await createQuestion(
      'Please paste in your repo clone URL (i.e: https://Valiums@github.com/Valiums/testtt.git)',
    );
  }

  // create the required folders and files
  await fs.ensureDir(localTypePath);
  await fs.outputJSON(configPath, { typesRepoURL, localTypePath });
  await fs.ensureFile(`${localTypePath}/index.ts`);
  await delay(1000 * 5);
  await deleteReadMe();
  const config = await readConfig({ username });
  try {
    await command(`git remote add ${remoteOriginName} ${config.typesRepoURL}`);
  } catch (e) {
    // ignore errror here
  }
  await updateTypes();
}

async function updateTypes() {
  try {
    await pullTypes();
    await pushToRepo();
    await updateRepoTypes();
    console.log(
      '✅  Success - Both project repo and type repo are in sync and up to date!',
    );
  } catch (e) {
    console.error(e.toString());
  }
}

async function pullTypes() {
  const config = await readConfig();
  try {
    await command(`git remote add ${remoteOriginName} ${config.typesRepoURL}`);
  } catch (e) {
    // do nothing on error here
  }
  try {
    await command(`git commit ${localTypePath} -m ts-sharedTypes_updateTypes `);
  } catch (e) {
    // do nothing on error here
  }
  try {
    await command(
      `git pull --allow-unrelated-histories ${remoteOriginName} main`,
    );
  } catch (e) {
    if (e.toString().includes('Merge conflict')) {
      throw new Error(
        '🙅‍♀️ You have a merge conflic in one of your type files. Fix it manually and commit on your repo then re-run TODO METTRE COMMANDE',
      );
    } else if (
      e
        .toString()
        .includes('as appropriate to mark resolution and make a commit')
    ) {
      throw new Error(
        '🤦‍♂️ You must first commit and push to your repo your merge conflict fixes.',
      );
    } else {
      throw e;
    }
  }
}

async function pushToRepo() {
  await command(`git push`);
}

interface Config {
  typesRepoURL: string;
  currentRepoURL: string;
  localTypePath?: string;
}

async function readConfig(options?: { username: string }): Promise<Config> {
  let usernameToUse = globalUsername;

  if (options && options.username) {
    usernameToUse = options.username;
  }

  const config = (await fs.readJSON(configPath)) as Config;
  config.typesRepoURL = config.typesRepoURL.replace(
    'github.com/',
    `${usernameToUse}@github.com/`,
  );

  if (config.localTypePath) {
    localTypePath = config.localTypePath;
    tmpTypePath = `./.tmp/${localTypePath}`;
  }

  return config;
}

async function changeToTypesRepo() {
  await fs.rename(gitPath, gitPathTmp);
}

async function changeToCurrentRepo() {
  await fs.remove(gitPath);
  await fs.rename(gitPathTmp, gitPath);
}

async function updateRepoTypes() {
  try {
    const config = await readConfig();
    await changeToTypesRepo();

    await command(`git clone ${config.typesRepoURL} ${tmpPath}`);

    await fs.copy(localTypePath, tmpTypePath);
    await command(`git add ${localTypePath}`, {
      cwd: tmpPath,
    });

    await command(
      `git commit ${localTypePath} -m ts-sharedTypes_updateTypes `,
      {
        cwd: tmpPath,
      },
    );
    await command(`git push`, { cwd: tmpPath });
  } catch (e) {
    if (e.toString().includes(`Your branch is up to date with 'origin/main'`)) {
      console.log(
        '💯  Remote Type-Repo already up to date - Nothing more to do.',
      );
    } else {
      throw e;
    }
  } finally {
    await fs.remove(tmpPath);
    await changeToCurrentRepo();
  }
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function deleteReadMe() {
  try {
    const config = await readConfig();
    await changeToTypesRepo();

    await command(`git clone ${config.typesRepoURL} ${tmpPath}`);

    await fs.remove(`${tmpPath}/README.md`);

    await command(`git commit ./README.md -m ts-sharedTypes_removedREADME `, {
      cwd: tmpPath,
    });
    await command(`git push`, { cwd: tmpPath });
  } finally {
    await fs.remove(tmpPath);
    await changeToCurrentRepo();
  }
}
