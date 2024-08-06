import {useState} from "react";
import {DatetimeInput} from "../components/DatetimeInput.tsx";
import {IconButton} from "../components/IconButton.tsx";
import {PaintRoller} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import {useStore} from "../store/store.ts";

export const AuthorCleanupScreen = ()=>{
  const [cleanUpBefore, setCleanUpBefore] = useState<Date>()
  const [openDialog, setOpenDialog] = useState<boolean>(false)
  const settingsSocket = useStore(state=>state.settingsSocket)


  const deleteAuthorsBefore = (date: Date)=>{
    settingsSocket?.emit('deleteAuthorsBefore', date.getTime())
  }

  return <div>
    <Dialog.Root open={openDialog}><Dialog.Portal>
      <Dialog.Overlay className="dialog-confirm-overlay" />
      <Dialog.Content  className="dialog-confirm-content">
        <div className="">
          <div className=""></div>
          <div className="">
            Delete all authors before {cleanUpBefore?.toLocaleString()}?
          </div>
          <div className="settings-button-bar">
            <button onClick={()=>{
              setOpenDialog(false)
            }}>Cancel</button>
            <button onClick={()=>{
              deleteAuthorsBefore(cleanUpBefore!)
              setOpenDialog(false)
            }}>Ok</button>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
    </Dialog.Root>
    <h1>Author cleanup</h1>

    <div>
      <DatetimeInput onChange={(c)=>setCleanUpBefore(c)} value={cleanUpBefore!}/>

      {cleanUpBefore&&<p>All authors before {cleanUpBefore.toLocaleString()} will be deleted</p>}

      <IconButton disabled={cleanUpBefore == undefined} icon={<PaintRoller/>} title="Delete authors?" onClick={()=>{
        setOpenDialog(true)
      }}/>
    </div>
  </div>
}
