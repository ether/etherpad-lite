import {useState} from "react";
import {useStore} from "../store/store.ts";
import {useNavigate} from "react-router-dom";

export const LoginScreen = ()=>{
    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')

    const login = ()=>{
        fetch('/admin-auth/', {
            method: 'POST',
            headers:{
                Authorization: `Basic ${btoa(`${username}:${password}`)}`
            }
        }).then(r=>{
            if(!r.ok) {
                useStore.getState().setToastState({
                    open: true,
                    title: "Login failed",
                    success: false
                })
            } else {
                navigate('/')
            }
        }).catch(e=>{
            console.error(e)
        })
    }

    return <div className="login-background">
        <div className="login-box">
            <h1 className="login-title">Login Etherpad</h1>
            <div className="login-inner-box">
                <div>Username</div>
                <input className="login-textinput" type="text" name="username" value={username} onChange={v => setUsername(v.target.value)} placeholder="Username"/>
                <div>Passwort</div>
                <input className="login-textinput" type="password" name="password" value={password}
                       onChange={v => setPassword(v.target.value)} placeholder="Password"/>
                <input type="button" value="Login" onClick={login} className="login-button"/>
            </div>
        </div>
    </div>
}
