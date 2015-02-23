#!/usr/bin/env python3

"""
When run, this brings up a Tornado web server which accepts transcript
recording from the GlkOte library.

###
To use this, install Tornado (version 3) and "python3 transcript-demo.py".
Then add
  recording_url: 'http://localhost:4000/'
to the Game object fields in sample-demo.html. Commands in the demo game
will be send to the server, which will print them out.

Written by Andrew Plotkin. This script is in the public domain.
"""

import logging
import os
import json

import tornado.web
import tornado.gen
import tornado.ioloop
import tornado.options
import tornado.websocket

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
        ls = list(self.application.games.values())
        ls.sort(key=lambda val:val.launched)
        self.render('repeat-menu.html', games=ls)

class RecordHandler(tornado.web.RequestHandler):
    def check_xsrf_cookie(self):
        # All the form input on this page is GlkOte AJAX requests,
        # so we'll skip XSRF checking.
        pass
    
    @tornado.gen.coroutine
    def get(self):
        self.write('This is transcript-demo.py.')
        
    @tornado.gen.coroutine
    def post(self):
        state = json.loads(self.request.body.decode())
        
        # We use json.dumps as an easy way to pretty-print the object
        # we just parsed.
        print(json.dumps(state, indent=1, sort_keys=True))
        self.write('Ok')

        sid = state['sessionId']
        game = self.application.games.get(sid)
        if not game:
            game = Game(sid, state['label'])
            game.launched = state['timestamp']
            self.application.games[sid] = game

class RepeatHandler(tornado.web.RequestHandler):
    @tornado.gen.coroutine
    def get(self, sid):
        if sid not in self.application.games:
            raise tornado.web.HTTPError(404, 'No such session ID')
        self.render('repeat-view.html', sid=sid)

class SocketHandler(tornado.websocket.WebSocketHandler):
    sid = None
    
    def open(self, sid):
        sid = sid.decode()  # It comes in as bytes?
        if sid not in self.application.games:
            raise tornado.web.HTTPError(404, 'No such session ID')
        self.sid = sid
        self.application.create_connection(sid, self)
        
    def on_message(self, msg):
        print('### on_message ' + str(self.sid))
        pass
    
    def on_close(self):
        print('### on_close ' + str(self.sid))
        pass

class Game:
    def __init__(self, sid, label):
        self.id = sid
        self.label = label
        self.windows = []
        self.gridcontent = {}

class Connection:
    last_connid = 1
    
    def __init__(self, sid, sock):
        self.id = Connection.last_connid
        Connection.last_connid += 1
        self.sid = sid
        self.sock = sock
        
# Core handlers.
handlers = [
    (r'/', MainHandler),
    (r'/record', RecordHandler),
    (r'/repeat/([0-9]+)', RepeatHandler),
    (r'/websocket/([0-9]+)', SocketHandler),
]

class MyApplication(tornado.web.Application):
    """MyApplication is a customization of the generic Tornado web app
    class.
    """
    def init_app(self):
        # Grab the same logger that tornado uses.
        self.log = logging.getLogger("tornado.general")

        # Game repository; maps session ID to game objects.
        self.games = {}
        # Connection repository; maps connection ID to connection objects
        self.conns = {}
        
    def create_connection(self, sid, sock):
        conn = Connection(sid, sock)
        self.conns[conn.id] = conn

application = MyApplication(
    handlers,
    **appoptions)

application.init_app()
application.listen(opts.port)
tornado.ioloop.IOLoop.instance().start()


    
