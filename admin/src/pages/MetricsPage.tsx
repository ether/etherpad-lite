import {useEffect} from "react";
import {useStore} from "../store/store.ts";

export const MetricsPage = ()=> {
  const socket = useStore(state=>state.settingsSocket)

  useEffect(() => {
    if (socket === undefined) return

    socket?.on('metrics:result', (d)=>{
      console.log(d)
    })

    socket?.emit('metrics')
  }, [socket]);


  return <>
    <h1>Metrics</h1>

    </>
}
