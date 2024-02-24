import 'tailwindcss/tailwind.css'
import {connect} from 'socket.io-client'
import {useEffect} from "react";

export const Admin = ()=>{


    useEffect(() => {
        const socket =  connect('/settings')

        socket.on('connect', () => {
            socket.emit('load');
        });

        socket.on('disconnect', (reason) => {
            // The socket.io client will automatically try to reconnect for all reasons other than "io
            // server disconnect".
            if (reason === 'io server disconnect') socket.connect();
        });

        socket.on('settings', (settings) => {
          console.log(settings)
        })
    }, []);


    return(
            <h1 className="">Admin1234</h1>
    )
}

export default Admin
