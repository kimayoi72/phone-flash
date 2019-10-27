import { useState, Fragment, useContext } from "react"
import React from "react"

/**
 * Checks given permission
 * @export
 * @param {PermissionDescriptor} permissionDescription
 * @returns {PermissionState}
 */
export function usePermissionState(permissionDescription: PermissionDescriptor): PermissionState {
  const [state, setState] = useState<PermissionState>(() => "denied");
  navigator.permissions.query(permissionDescription).then(result => {
    setState(result.state);
    result.onchange = () => setState(result.state);
  });
  return state;
}


interface PermissionContextType {
  state : PermissionState
  name : PermissionName
}
const permissionContext : PermissionContextType = {
  state : 'denied',
  name : 'microphone'
}
const PermissionContext = React.createContext<PermissionContextType>(permissionContext)
interface PermissionSwitchProps {
  permissionDescription : PermissionDescriptor
}
export const PermissionSwitch: React.SFC<PermissionSwitchProps> = (props) => {
  const permission = usePermissionState(props.permissionDescription)
  return (
    <PermissionContext.Provider value={{state:permission, name:props.permissionDescription.name}}>
      {props.children}
    </PermissionContext.Provider>
  )
}

interface PermissionWhenProps {
  state : PermissionState
}
export const PermissionWhen: React.SFC<PermissionWhenProps> = (props) => {
  const permission = useContext(PermissionContext)
  if (permission.state === props.state) {
    return (<Fragment>{props.children}</Fragment>)
  }
  return (null)
}
