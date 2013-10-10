#!/usr/bin/env python3

"""
Remote-IF script. When run, this brings up a Tornado web server which
allows clients to play an IF game via RemGlk / GlkOte.

Written by Andrew Plotkin. This script is in the public domain.
"""

import logging
import os
import json
import binascii
import shlex

import tornado.web
import tornado.gen
import tornado.ioloop
import tornado.options

tornado.options.define(
    'port', type=int, default=4000,
    help='port number to listen on')

tornado.options.define(
    'debug', type=bool,
    help='application debugging (see Tornado docs)')

tornado.options.define(
    'command', type=str,
    help='shell command to run a RemGlk game')

# Parse 'em up.
tornado.options.parse_command_line()
opts = tornado.options.options

if not opts.command:
    raise Exception('Must supply --command argument')

# Define application options which are always set.
appoptions = {
    'xsrf_cookies': True,
    'template_path': './templates',
    'static_path': './static',
    'cookie_secret': '__FILL_IN_RANDOM_DATA_HERE__',
    }

# Pull out some of the config-file options to pass along to the application.
for key in [ 'debug' ]:
    val = getattr(opts, key)
    if val is not None:
        appoptions[key] = val

class MainHandler(tornado.web.RequestHandler):
    @tornado.gen.coroutine
    def get(self):
        sessionid = self.get_secure_cookie('sessionid')
        self.render('main.html', sessionid=sessionid)
        
    @tornado.gen.coroutine
    def post(self):
        if self.get_argument('signin', None):
            # Create a random sessionid string
            sessionid = binascii.hexlify(os.urandom(16)) # bytes, not string
            self.set_secure_cookie('sessionid', sessionid, expires_days=10)
        elif self.get_argument('signout', None):
            sessionid = None
            self.clear_cookie('sessionid')
        else:
            raise Exception('Unknown form button')
        self.render('main.html', sessionid=sessionid)
        
class PlayHandler(tornado.web.RequestHandler):
    def check_xsrf_cookie(self):
        # All the form input on this page is GlkOte AJAX requests,
        # so we'll skip XSRF checking. (If we wanted to include XSRF,
        # we could embed {{ xsrf_token }} in the play.html template.)
        pass
    
    @tornado.gen.coroutine
    def get(self):
        sessionid = self.get_secure_cookie('sessionid')
        if not sessionid:
            raise Exception('You are not logged in')
        
        session = self.application.sessions.get(sessionid)
        if not session:
            session = Session(self.application, sessionid)
            self.application.sessions[sessionid] = session
            self.application.log.info('Created session object %s', session)
            
        self.render('play.html')
        
    @tornado.gen.coroutine
    def post(self):
        self.application.log.info('### play post: %s', self.request.body)
        sessionid = self.get_secure_cookie('sessionid')
        if not sessionid:
            raise Exception('You are not logged in')
        session = self.application.sessions.get(sessionid)
        if not session:
            raise Exception('No session found')

        # Start the game process if it's not already running.
        if not session.proc:
            session.launch()

        # Create a callback object. We'll block on this, and the game's
        # output handler will trigger it when the response is complete.
        if session.callback is not None:
            raise Exception('Already has a callback')
        callkey = object()
        session.callback = yield tornado.gen.Callback(callkey)

        # This logic relies on the proper behavior of the RemGlk library:
        # that it produces exactly one JSON output for every JSON input.
        # Timer events will make a mess of that logic, but RemGlk doesn't
        # support timers yet.
        
        session.input(self.request.body)
        res = yield tornado.gen.Wait(callkey)
        print(res.decode()) ###
        session.callback = None

        self.write(res)
        self.set_header("Content-Type", "application/json; charset=UTF-8")

class Session:
    def __init__(self, app, sessionid):
        self.log = app.log
        self.id = sessionid
        self.proc = None
        self.linebuffer = []
        self.callback = None
        
    def __repr__(self):
        return '<Session "%s">' % (self.id.decode(),)

    def launch(self):
        self.log.info('Launching game for %s', self)
        
        args = shlex.split(opts.command)
        self.proc = tornado.process.Subprocess(
            args,
            close_fds=True,
            stdin=tornado.process.Subprocess.STREAM,
            stdout=tornado.process.Subprocess.STREAM)
        self.proc.stdout.read_until_close(
            self.gameclosed, self.gameread)

    def input(self, msg):
        """Pass an update (bytes) along to the game.
        """
        self.proc.stdin.write(msg)

    def gameread(self, msg):
        """Callback for game process output (which will be bytes).
        We accumulate output until it's a complete JSON message, and then
        trigger the waiting callback.
        """
        self.linebuffer.extend(msg.splitlines())
        testjson = ''
        for ix in range(len(self.linebuffer)):
            testjson += self.linebuffer[ix].decode()
            try:
                json.loads(testjson)
                res = b'\n'.join(self.linebuffer[0:ix+1])
                self.linebuffer[0:ix+1] = []
                if self.callback is not None:
                    self.callback(res)
                return
            except:
                continue

    def gameclosed(self, msg):
        """Callback for game process termination. (Technically, EOF on
        the game's stdout.)
        """
        self.log.info('Game has terminated!')
    
        
# Core handlers.
handlers = [
    (r'/', MainHandler),
    (r'/play', PlayHandler),
]

class MyApplication(tornado.web.Application):
    """MyApplication is a customization of the generic Tornado web app
    class.
    """
    def init_app(self):
        # Grab the same logger that tornado uses.
        self.log = logging.getLogger("tornado.general")

        # Session repository; maps session ID to session objects.
        self.sessions = {}

application = MyApplication(
    handlers,
    **appoptions)

application.init_app()
application.listen(opts.port)
tornado.ioloop.IOLoop.instance().start()


    
