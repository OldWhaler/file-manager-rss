const { createHmac } = await import('node:crypto');
import { createReadStream, createWriteStream } from "fs";
import { readdir, access, writeFile, rename, unlink, readFile, stat } from 'node:fs/promises';
import { cwd, chdir, arch } from 'node:process';
import { resolve, parse } from 'node:path';
import { EOL, cpus, userInfo } from 'node:os';
import { createBrotliCompress, createBrotliDecompress } from 'node:zlib';
import { pipeline } from 'node:stream/promises'

import { OperationError } from '../helpers/index.js';

export const Handlers = {
  '.exit': function () {
    if (arguments[0].length !== 0) throw new OperationError();
    process.exit();
  },

  'up': function () {
    if (arguments[0].length !== 0) throw new OperationError();
    this.cd(['..']);
  },

  'cd': function (args) {
    const argsString = args.join(' ') || cwd()
    const newPath = resolve(argsString + '\\');

    try {
      chdir(newPath);
    } catch (error) {
      throw new OperationError();
    }
  },

  'ls': async function () {
    if (arguments[0].length !== 0) throw new OperationError();
    const data = (await readdir(cwd(), { withFileTypes: true })).sort();

    const result = data.reduce((acc, curr) => {
      const isDirectory = curr.isDirectory();
      const info = {
        Name: curr.name,
        Type: isDirectory ? 'directory' : 'file'
      };
      isDirectory ? acc[0].push(info) : acc[1].push(info);

      return acc;
    }, [[], []]);

    console.table([...result.flat()]);
  },

  'cat': async function (args) {
    if (args.length < 1) throw new OperationError();
    const filePath = resolve(args.join(' '));

    await access(filePath);
    const rs = createReadStream(filePath);

    return new Promise((resolve, reject) => {
      let data = "";

      rs.on("data", chunk => data += chunk);
      rs.on("end", () => resolve(console.log(data)));
      rs.on("error", error => reject(error));
    });

  },

  'add': async function (args) {
    if (args.length < 1) throw new OperationError();

    const filePath = resolve(args.join(' '));

    try {
      await access(filePath);
      console.log('File already exists in the working directory');
    } catch (error) {
      await writeFile(filePath, '')
    }
  },

  'rn': async function (args) {
    if (args.length !== 2) throw new OperationError();

    const { dir } = parse(resolve(args[0]));
    await rename(args[0], resolve(dir, args[1]))
  },

  'cp': async function (args) {
    if (args.length !== 2) throw new OperationError();

    const filePath = resolve(args[0])
    await access(filePath);

    const { base } = parse(filePath);

    try {
      await access(resolve(args[1], base));
      console.log('File already exists in the new directory');
    } catch (error) {
      const rs = createReadStream(filePath);
      const ws = createWriteStream(resolve(args[1], base));
      return new Promise((resolve, reject) => {
        rs.pipe(ws)
        rs.on('end', () => resolve());
        rs.on("error", error => reject(error));
      })
    }
  },

  'rm': async function (args) {
    if (args.length < 1) throw new OperationError();
    const filePath = resolve(args.join(' '));
    await unlink(filePath)
  },

  'mv': async function (args) {
    await this.cp(args);
    await this.rm([args[0]]);
  },

  'os': function (args) {
    if (args.length !== 1) throw new OperationError();
    const { username, homedir } = userInfo();
    const cpusInfo = cpus();

    const info = {
      '--EOL': JSON.stringify(EOL),
      '--cpus': {
        overallAmount: cpusInfo.length,
        model: cpusInfo[0].model,
        speed: `${(cpusInfo[0].speed / 1000)}GHz`
      },
      '--homedir': homedir,
      '--username': username,
      '--architecture': arch
    };

    const infoKeys = Object.keys(info);
    if (!infoKeys.includes(args[0])) throw new OperationError();

    console.log(info[args[0]]);
  },

  'hash': async function (args) {
    if (args.length !== 1) throw new OperationError();

    const data = await readFile(args[0]);

    const hash = createHmac('sha256', data)
      .update('I love cupcakes')
      .digest('hex');
    console.log(hash);
  },

  'compress': async function (args) {
    if (args.length !== 2) throw new OperationError();

    const filePath = resolve(args[0]);
    const dest = resolve(args[1]);

    try {
      const fileStat = await stat(filePath);
      const destStat = await stat(dest);

      if (!fileStat.isFile || !destStat.isDirectory) throw new Error();

      const compressedFileName = `${parse(filePath).name}.br`;

      const rs = createReadStream(filePath);
      const ws = createWriteStream(resolve(dest, compressedFileName));
      const cs = createBrotliCompress();

      await pipeline(rs, cs, ws)
    } catch (error) {
      throw error
    }
  },

  'decompress': async function (args) {
    if (args.length !== 2) throw new OperationError();

    const filePath = resolve(args[0]);
    const dest = resolve(args[1]);

    try {
      const fileStat = await stat(filePath);
      const destStat = await stat(dest);


      if (!fileStat.isFile || !destStat.isDirectory) throw new Error();

      const fileInfo = parse(filePath);
      if (fileInfo.ext !== '.br') throw new Error();

      const rs = createReadStream(filePath);
      const ws = createWriteStream(resolve(dest, fileInfo.name));
      const cs = createBrotliDecompress();
      await pipeline(rs, cs, ws)

    } catch (error) {
      throw error
    }
  }
}


