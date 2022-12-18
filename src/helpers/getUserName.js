//--username=your_username

export function getUserName() {
  const user = process.argv.find(arg => arg.match(/^--username/));

  return user ? user.split('=')[1] : 'Anonymous';
}
