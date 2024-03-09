import {useState} from "react";

export const LoginScreen = ()=>{
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')

    const login = ()=>{
        fetch('/api/auth', {
            method: 'GET',
            headers:{
                Authorization: `Basic ${btoa(`${username}:${password}`)}`
            }
        }).then(r=>{
            console.log(r.status)
        }).catch(e=>{
            console.error(e)
        })
    }

    return <div className="login-background">
        <div className="login-box">
            <h1 className="login-title">Login Etherpad</h1>
            <div className="login-inner-box">
                <div>Username</div>
                <input className="login-textinput" type="text" value={username} onChange={v => setUsername(v.target.value)} placeholder="Username"/>
                <div>Passwort</div>
                <input className="login-textinput" type="password" value={password}
                       onChange={v => setPassword(v.target.value)} placeholder="Password"/>
                <input type="button" value="Login" onClick={login} className="login-button"/>
            </div>
        </div>
    </div>
}
