import { stdin, chdir, cwd } from 'process';
import { homedir } from 'node:os';
import { getUserName, Messages, OperationError } from './helpers/index.js';
import { Handlers } from './handlers/Handlers.js';

chdir(homedir());

const userName = getUserName();

console.log(`Welcome to the File Manager, ${userName}!`);
console.log(`You are currently in ${cwd()}`)


process.on('exit', () => console.log(`Thank you for using File Manager, ${userName}, goodbye!`));
process.on('SIGINT', process.exit);


stdin.on('data', async data => {
  const availableOperations = Object.keys(Handlers);
  const [currOperation, ...args] = data.toString().trim().split(' ');

  try {
    if (!availableOperations.includes(currOperation)) {
      throw new OperationError()
    }

    await Handlers[currOperation](args);
    console.log(`You are currently in ${cwd()}`);

  } catch (error) {
    if (error instanceof OperationError) {
      console.log(error.message);
    } else {
      console.log(Messages.ERROR_MSG)
    }
  }

});






