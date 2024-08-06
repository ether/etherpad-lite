import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import {FC} from "react";

type DatetimeInputProps = {
  value: Date,
  onChange: (value: Date) => void
}

export const DatetimeInput:FC<DatetimeInputProps> = ({
  onChange,value
                                                     })=>{

  return (
    <DayPicker
      required
      mode="single"
      selected={value}
      onSelect={onChange}
    />
  );
}
