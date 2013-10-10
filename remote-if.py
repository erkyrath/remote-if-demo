#!/usr/bin/env python3

import logging
import os
import binascii

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

# Parse 'em up.
tornado.options.parse_command_line()
opts = tornado.options.options

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
            sessionid = binascii.hexlify(os.urandom(16)) # bytes, not string
            self.set_secure_cookie('sessionid', sessionid, expires_days=10)
        elif self.get_argument('signout', None):
            sessionid = None
            self.clear_cookie('sessionid')
        else:
            raise Exception('Unknown form button')
        self.render('main.html', sessionid=sessionid)
        
class PlayHandler(tornado.web.RequestHandler):
    @tornado.gen.coroutine
    def get(self):
        sessionid = self.get_secure_cookie('sessionid')
        if not sessionid:
            raise Exception('You are not logged in')
        
        session = self.application.sessions.get(sessionid)
        if not session:
            session = Session(sessionid)
            self.application.sessions[sessionid] = session
            self.application.log.info('Created session object %s', session)
            
        self.render('play.html')

class Session:
    def __init__(self, sessionid):
        self.id = sessionid
    def __repr__(self):
        return '<Session "%s">' % (self.id.decode(),)
        
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

        # Maps session ID to session objects.
        self.sessions = {}

application = MyApplication(
    handlers,
    **appoptions)

application.init_app()
application.listen(opts.port)
tornado.ioloop.IOLoop.instance().start()


    
