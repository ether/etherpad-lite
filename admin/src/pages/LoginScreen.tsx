import {useStore} from "../store/store.ts";
import {useNavigate} from "react-router-dom";
import {SubmitHandler, useForm} from "react-hook-form";
import {Eye, EyeOff} from "lucide-react";
import {useState} from "react";

type Inputs = {
    username: string
    password: string
}

export const LoginScreen = ()=>{
    const navigate = useNavigate()
    const [passwordVisible, setPasswordVisible] = useState<boolean>(false)

    const {
        register,
        handleSubmit} = useForm<Inputs>()

    const login: SubmitHandler<Inputs> = ({username,password})=>{
        fetch('/admin-auth/', {
            method: 'POST',
            headers:{
                Authorization: `Basic ${btoa(`${username}:${password}`)}`
            }
        }).then(r=>{
            if(!r.ok) {
                useStore.getState().setToastState({
                    open: true,
                    title: "登录失败",
                    success: false
                })
            } else {
                navigate('/')
            }
        }).catch(e=>{
            console.error(e)
        })
    }

    return <div className="login-background login-page">
        <div className="login-box login-form">
            <h6 className="login-title">管理后台</h6>
            <form className="login-inner-box input-control" onSubmit={handleSubmit(login)}>
                {/* <div>用户名称</div> */}
                <input {...register('username', {
                    required: true
                })} className="login-textinput input-control" type="text" placeholder="请输入登录名称"/>
                {/* <div>用户密码</div> */}
                <span className="icon-input">
                        <input {...register('password', {
                            required: true
                        })} className="login-textinput" type={passwordVisible?"text":"password"} placeholder="请输入登录密码"/>
                    {passwordVisible? <Eye onClick={()=>setPasswordVisible(!passwordVisible)}/> :
                        <EyeOff onClick={()=>setPasswordVisible(!passwordVisible)}/>}
                    </span>
                <input type="submit" value="系统登录" className="login-button"/>
            </form>
        </div>
    </div>
}
