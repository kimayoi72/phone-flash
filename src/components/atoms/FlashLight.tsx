import React from 'react'

interface FlashLightProps {
  color: string
}

export function FlashLight(props: FlashLightProps) {
  return (
    <div style={{background:props.color,width:"30em",height:"30em"}}>
    </div>
  )
}