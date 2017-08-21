# ssh-exec

Execute a script over ssh using Node.JS and pipe to and from it

It is available through npm

```
npm install ssh-exec
```

It is written in plain Javascript and uses [ssh2](https://github.com/mscdex/ssh2) for all the heavy lifting.

A SSH package aimes for further use in Atom terminal package. My name in its title does not indicate that I did all the work, rather just indicates that it has some of my preferences applied to it. It has been forked from the Cludoki/shh-exec package. 

##Purpose

Naturally, one may wonder why I bothered creating this package, the reason why is because I wanted to apply the bug fixes mentioned in Cloudoki/shh-exec and for some reasons not merged into original [mafintosh/ssh-exec](https://github.com/mafintosh/ssh-exec) code. This is an active fork, that is, I will keep an eye on changes to the originated from packages and if relevant I bring them downstream to this package.

## Usage

``` js
var exec = require('ssh-exec')

// using ~/.ssh/id_rsa as the private key

exec('ls -lh', 'ubuntu@my-remote.com').pipe(process.stdout)

// or using the more settings

exec('ls -lh', {
  user: 'ubuntu',
  host: 'my-remote.com',
  key: myKeyFileOrBuffer,
  password: 'my-user-password'
}).pipe(process.stdout)

// or if you want to pipe some data to the remote process

process.stdin
  .pipe(exec('echo try typing something; cat -', 'ubuntu@my-remote.com'))
  .pipe(process.stdout)
```

Optionally there is a callback api as well

``` js
exec('ls -lh', 'ubuntu@my-remote.com', function (err, stdout, stderr) {
  console.log(err, stdout, stderr)
})
```

## License

MIT
