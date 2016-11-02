import io from 'socket.io-client';
import { document } from 'global';

const location = document.location;
const port = location.port === '' ? (location.protocol === 'https:' ? 443 : 80) : location.port;
const url = `${location.protocol}//${location.hostname}:${port}/`;

export default io.connect(url, {
    path: '/api_socket'
});