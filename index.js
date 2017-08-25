var ssh2 = require('ssh2')
var fs = require('fs')
var path = require('path')
var duplexify = require('duplexify')
var once = require('once')
var debug = false

var HOME = process.env.HOME || process.env.USERPROFILE

var parse = function (opts) {
  if (typeof opts === 'string') {
    opts = opts.match(/^(?:([^@]+)@)?([^:]+)(?::(\d+))?$/) || []
    opts = {
      host: opts[2],
      user: opts[1],
      port: parseInt(opts[3], 10) || 22
    }
  }

  return opts
}

var exec = function (cmd, opts, cb) {
  opts = parse(opts)
  cmd = cmd.endsWith('\n') ? cmd: (cmd+'\n')
  var stream = duplexify()
  var client = new ssh2.Client()
  var key = opts.key === false ? undefined : opts.key || path.join(HOME, '.ssh', 'id_rsa')
  var fingerprint
  var finished = false
  var _err
  var conn

  client.on('error', function (err) {
    if (debug) console.log('Error by client connect: '+err);
    if (err.toString().endsWith('All configured authentication methods failed'))
    err.message+=',\n may be too many loging attempts for user "'+client.config.username+'"'+(opts.key? (' or wrong key '+opts.key) : '')
    stream.push('Connection '+err+'\n')
    //try{
    stream.emit('error',err.message)
    // } catch(e){}
  })
  client.on('close', function () {
    if (debug) console.log('client connection closed ');
    stream.destroy()
  //  client.end()
  })
  client.on('end', function () {
    if (debug) console.log('client connection ended ');
  })
  client.on('drain', function () {
    if (debug) console.log('client connection drained ');
  })

  client.on('banner', function (banner) {
    if (debug) console.log('Server banner:\n' +banner);
  })
  client.on('greeting', function (greeting) {
    if (debug) console.log('client connection greeting:\n' +greeting);
  })

  client.on('timeout', function() {
    stream.destroy(new Error('socket timeout'))
  })

  var connect = function () {
    var verifier = function (hash) {
      fingerprint = hash

      if (!opts.fingerprint) return true
      if (fingerprint === opts.fingerprint) return true

      return false
    }

    if (opts.password) {
      client.on('keyboard-interactive', function (a, b, c, prompt, cb) {
        cb([opts.password])
      })
    }
    try {
     conn = client.connect({
      host: opts.host,
      username: opts.user,
      password: process.env.SSH_PASSWORD || opts.password,
      passphrase: process.env.SSH_PASSPHRASE || opts.passphrase,
      port: opts.port || 22,
      tryKeyboard: !!opts.password,
      privateKey: key,
      allowAgentFwd: opts.allowAgentFwd,
      agent: process.env.SSH_AUTH_SOCK || opts.agent,
      hostHash: opts.hostHash || 'md5',
      hostVerifier: verifier,
      localUsername: opts.localUsername,
      localHostname: opts.localHostname,
      forceIPv4: opts.forceIPv4,
      forceIPv6: opts.forceIPv6,
      keepaliveCountMax: opts.keepaliveCountMax,
      keepaliveInterval: opts.keepaliveInterval,
      algorithms: opts.algorithms,
      compress: opts.compress,
      strictVendor: opts.strictVendor,
      readyTimeout: opts.readyTimeout,
      timeout: opts.timeout,
      sock: opts.sock
    })
   } catch (e) {
     if (debug) console.log('connect error: '+e);
     //console.log(conn);

    // cb=once(cb)

  //   stream = new duplexify()
     //stream.setReadable(process)
     //stream.setWritable(process)
     if (e.toString().endsWith('encoding too long'))       e.message+=',may be wrong passphrase'
     //if (e.toString().endsWith('All configured authentication methods failed')) e.message=e.message+',may be too many loging attempts'

     stream.push('Connection '+e+'\n')
     //stream.read(e)
     //cb=once(cb)
     //if (cb) cb(e, '', '')
     stream.emit('warn',e.message)
     //stream.emit('end')
      //stream.emit('close')
      stream.destroy()
     //throw e;

     //client.end()
     //stream.destroy(e)
   }
  }
  //conn.on('ready', function() { run()})

  var run = function () {
    if (debug) console.log('opts.exec- '+opts.exec)
    client.exec(cmd, opts.exec || {}, function (err, stdio1) {
      if (err) {
         if (debug) console.log('server error: '+err)
        //return
        stream.destroy(err)
        throw err;
      }
      //if (debug) console.log(stream);

      stream.setReadable(stdio1)
      stream.setWritable(stdio1)

      stream.emit('ready')

      stdio1.stderr.setEncoding('utf-8')
      stdio1.stderr.on('data', function (data) {
        stream.emit('warn', data)
        if (debug) console.log( 'stderr data:  ' +data )
      //  if (finished) client.end()
      })

      stdio1.on('exit', function (code) {
        if (code !== 0) {
            if (debug) console.log( 'exit emitted  ' )
        //  var err = new Error('Non-zero exit code: ' + code)
        //  err.code = code
          stream.emit('error', 'Non-zero exit code: ' + code)
        }
        stream.emit('exit', code)
        finished =  true
        //client.end()
      })

    })
  }

  var onverify = function (err) {
    if (debug) console.log('onverify');
    if (err) return stream.destroy(err)
    run()
  }

  client.once('ready', function () {
    if (fingerprint === opts.fingerprint) {
      if (debug) console.log('fingerprint OK');
      return run()
    }
    if (!stream.emit('verify', fingerprint, onverify)) {
      if (debug) console.log('emitted verify with fingerprint: '+fingerprint);
      return run()
    }
  })

  stream.on('close', function () {
    client.end()
  })

  stream.on('end', function () {
   if (debug) console.log( 'ending..' ) // IDEA: use debug
   client.end()
  })


   if (!key || Buffer.isBuffer(key) || key.toString().indexOf('\n') > -1) {
    connect()
   } else {
    fs.readFile(key, function (_, buffer) {
      key = buffer
      connect()
    })
   }


  if (cb) {
    if (debug) console.log('ready to call cb');
    oncallback(_err, finished, stream, cb)
  }
  return stream
}

var oncallback = function (_err, isfinished, stream, cb) {
  cb = once(cb)

  var stderr = ''
  var stdout = ''
  if (debug) console.log('calling cb');
  stream.setEncoding('utf-8')

  stream.on('warn', function (data) {
    stderr += data
    //stdout += data
  })

  stream.on('data', function (data) {
    stdout += data
  })

  stream.on('error', function (err) {
    if (debug) console.log('stream error event: '+err);
    _err = err
    if (stream._ended) cb(err, stdout, stderr)
  })

  stream.on('close', function () {
    if (debug) console.log('stream close event');
    cb(_err, stdout, stderr)
  })

  stream.on('end', function () {
    if (debug) console.log('stream end event');
    cb(_err, stdout, stderr)
  })
    //cb()
}

module.exports = exec
