import {FC, JSX, ReactElement} from "react";

export type IconButtonProps = {
    icon: JSX.Element,
    title: string|ReactElement,
    onClick: ()=>void,
    className?: string,
    disabled?: boolean
}

export const IconButton:FC<IconButtonProps> = ({icon,className,onClick,title, disabled})=>{
    return <button onClick={onClick} className={"icon-button "+ className} disabled={disabled}>
        {icon}
        <span>{title}</span>
        </button>
}
