let subscribers = [];
const postMessage = {
    subscribe: (name, handler) => {
        const id = new Date().getTime().toString(36) + Math.random().toString(36).substr(2, 9);

        subscribers.push({
            id,
            name,
            handler
        });

        return () => {
            subscribers = subscribers.filter(subscriber => subscriber.id !== id);
        };
    },
    send: (name, data) => {
        subscribers.forEach(subscriber => {
            if (name === subscriber.name) {
                subscriber.handler(data);
            }
        });
    }
}

export default window.top.pm = postMessage;