var exec = require('ssh-exec-plus')
var debug = true

//exec('ls -lh', 'admin@vps4221903.ovh.net').pipe(process.stdout)

// or using the more settings
// using ~/.ssh/id_rsa as the private key
if (debug) console.log('starting');

var stream = exec('echo йукенгёЁ qwertyu uptime', {
  user: 'admin',
  host: 'vps4221903.ovh.net',
  //key: 'c:/users/user1/.ssh/id_rsa',
  //passphrase: '123'
  password: '1232000'
}
,function (err, stdout, stderr) {
  console.log('cb err:' +err)
  console.log('cb stdout: ' +stdout )
  console.log('cb stderr: ' +stderr)
}
)

stream.on('data', function(data) {
console.log('example data: '+data)
});

stream.on('warn', function(data) {
console.log('example warn--: '+data)
});

stream.on('error', function(data) {
//  stream.pause();
console.log('example error--: '+data)
//  stream.resume();
});

stream.on('end', function() {
console.log('example ended ')
});

try {
//stream.write('echo hahaha;ls -lh\n')
//stream.write('uptime\n')
if (debug) console.log('Lets pipe:  ')
//stream.push('Piping:')
stream.pipe(process.stdout)
} catch(e) {
  console.log('Error by piping:  '+e)
  stream.push('Error piped: ')
  stream.pipe(process.stderr)
}


// or if you want to pipe some data to the remote process
try {
process.stdin
  .pipe(exec('echo try typing something; cat -', {
    user: 'admin',
    host: 'vps4221903.ovh.net',
    //key: 'c:/users/user1/.ssh/id_rsa'
    //passphrase: '123'
    //key: myKeyFileOrBuffer,
    password: '1232000'
  }))
  .pipe(process.stdout)
} catch(e) {
  console.log('stdin error '+e);
}
if (debug) console.log('all done');
