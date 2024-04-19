import {useEffect, useState} from "react";
import {SendHorizonal} from 'lucide-react'
import {useStore} from "../store/store.ts";

export const ShoutPage = ()=>{
    const [totalUsers, setTotalUsers] = useState(0);
    const [message, setMessage] = useState<string>("");
    const socket = useStore(state => state.settingsSocket);

    useEffect(() => {
        fetch('/stats')
            .then(response => response.json())
            .then(data => setTotalUsers(data.totalUsers));
    }, []);

    const sendMessage = () => {
        socket?.emit('shout', message);
    }

    return (
        <div>
            <h1>Communication</h1>
            {totalUsers > 0 && <p>There  {totalUsers>1?"are":"is"} currently {totalUsers} user{totalUsers>1?"s":""} online</p>}
            <div>
                <div className="send-message search-field" style={{width: '20%'}}>
                    <input value={message} onChange={v=>setMessage(v.target.value)} style={{width: '100%', paddingRight: '55px'}}/>
                    <SendHorizonal style={{bottom: '5px', right: '9px', color: '#0f775b'}} onClick={()=>sendMessage()}/>
                </div>
            </div>

        </div>
    )
}
