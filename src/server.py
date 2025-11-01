import json
import os
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict

from .db import InteractionStore
from .persona_loader import PersonaRepository
from .responder import PersonaResponder
from .state_machine import PersonaStateMachine

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PUBLIC_DIR = os.path.join(ROOT_DIR, 'public')
PERSONA_DIR = os.path.join(ROOT_DIR, 'persona')
TEMPLATE_DIR = os.path.join(ROOT_DIR, 'templates')


class InnerVoiceHandler(SimpleHTTPRequestHandler):
    repository: PersonaRepository = None
    state_machine: PersonaStateMachine = None
    responder: PersonaResponder = None
    store: InteractionStore = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def do_POST(self) -> None:
        if self.path == '/api/respond':
            self._handle_respond()
        else:
            self.send_error(HTTPStatus.NOT_FOUND, "Endpoint not found")

    def do_GET(self) -> None:
        if self.path.startswith('/api/logs'):
            self._handle_logs()
            return
        super().do_GET()

    def log_message(self, format: str, *args: Any) -> None:
        # Reduce server noise
        return

    def _handle_respond(self) -> None:
        try:
            content_length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            content_length = 0
        body = self.rfile.read(content_length) if content_length else b''
        try:
            payload = json.loads(body.decode('utf-8')) if body else {}
        except json.JSONDecodeError:
            self._json_response({"error": "Ungültiges JSON"}, status=HTTPStatus.BAD_REQUEST)
            return

        message = (payload.get('message') or '').strip()
        if not message:
            self._json_response({"error": "Die Nachricht darf nicht leer sein."}, status=HTTPStatus.BAD_REQUEST)
            return

        state = self.state_machine.resolve(message)
        response_text = self.responder.render(message, state)
        entry_id = self.store.log(message, state, response_text)

        self._json_response(
            {
                "id": entry_id,
                "persona": state['persona'].name,
                "personaSlug": state['persona'].slug,
                "tone": state.get('tone'),
                "mood": state.get('mood'),
                "response": response_text,
                "keywords": state.get('matched_keywords'),
                "confidence": state.get('confidence'),
            }
        )

    def _handle_logs(self) -> None:
        rows = self.store.fetch_recent()
        payload = [
            {
                "id": row['id'],
                "createdAt": row['created_at'],
                "message": row['user_message'],
                "persona": row['persona_name'],
                "response": row['response'],
                "tone": row['tone'],
                "mood": row['mood'],
                "keywords": row['keywords'],
                "confidence": row['confidence'],
            }
            for row in rows
        ]
        self._json_response(payload)

    def _json_response(self, payload: Dict[str, Any], status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def run(server_class=ThreadingHTTPServer, handler_class=InnerVoiceHandler) -> None:
    repository = PersonaRepository(PERSONA_DIR, TEMPLATE_DIR)
    personas = repository.personas
    handler_class.repository = repository
    handler_class.state_machine = PersonaStateMachine(personas)
    handler_class.responder = PersonaResponder(personas)
    handler_class.store = InteractionStore()

    server_address = ('', 8000)
    httpd = server_class(server_address, handler_class)
    print("InnerVoice läuft auf http://localhost:8000")
    print("Drücke STRG+C zum Beenden")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer wird beendet...")
    finally:
        httpd.server_close()


if __name__ == '__main__':
    run()
