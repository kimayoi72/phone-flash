import React, {
  useState,
  useCallback,
  useEffect,
  ChangeEventHandler,
  Fragment,
  useMemo,
  useRef
} from "react";
import {
  PermissionSwitch,
  PermissionWhen
} from "./components/atoms/Permission";

import logo from "./logo.svg";
import "./App.css";

import * as config from "./../package.json";

type MediaInfoFilter = (value: MediaDeviceInfo) => boolean;

function useMediaDevices(
  withRequestAccess: boolean,
  deviceFilter?: MediaInfoFilter
) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const enumerateDevices = useCallback(
    () =>
      navigator.mediaDevices
        .enumerateDevices()
        .then(devices =>
          setDevices(deviceFilter ? devices.filter(deviceFilter) : devices)
        ),
    [deviceFilter]
  );

  useEffect(() => {
    if (withRequestAccess) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(stream => enumerateDevices());
    } else {
      enumerateDevices();
    }
  }, [withRequestAccess, enumerateDevices]);

  return devices;
}

type OnDeviceSelectedCallback = (
  deviceInfo: MediaDeviceInfo | undefined
) => void;
interface MediaDeviceSelectorProps {
  onSelected: OnDeviceSelectedCallback;
  constraints?: MediaStreamConstraints;
}
export const MediaDeviceSelector: React.SFC<
  MediaDeviceSelectorProps
> = props => {
  const defaultDeviceFilter = (t: MediaDeviceInfo) => t.kind === "audioinput";
  const devices = useMediaDevices(true, defaultDeviceFilter);
  const handleOnChange = useCallback<ChangeEventHandler<HTMLSelectElement>>(
    event => {
      event.preventDefault();
      if (props.onSelected) {
        props.onSelected(devices[event.target.selectedIndex]);
      }
    },
    [devices, props]
  );
  return (
    <select onChange={handleOnChange}>
      {devices.map(info => {
        const key = info.kind + info.deviceId;
        return <option key={key}>{info.label}</option>;
      })}
    </select>
  );
};

type MediaStreamType = [
  MediaStreamAudioSourceNode | undefined,
  AnalyserNode | undefined
];
function useMediaStream(audioCtx: AudioContext): MediaStreamType {
  const [source, setSource] = useState<MediaStreamAudioSourceNode>();
  const [analyzer, setAnalyzer] = useState<AnalyserNode>();

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(stream => {
        const source = audioCtx.createMediaStreamSource(stream);
        const analyzerNode = audioCtx.createAnalyser();
        analyzerNode.fftSize = 256;
        analyzerNode.smoothingTimeConstant = 0.85;
        analyzerNode.minDecibels = -90;
        analyzerNode.maxDecibels = -10;

        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(3, audioCtx.currentTime);

        source.connect(gainNode);
        gainNode.connect(analyzerNode);

        setSource(source);
        setAnalyzer(analyzerNode);
      });
  }, [audioCtx]);

  return [source, analyzer];
}

const AudioPage: React.SFC = props => {
  const audioCtx = useMemo(() => new window.AudioContext(), []);
  const [, analyzer] = useMediaStream(audioCtx);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasCtx = useMemo(
    () =>
      canvasRef.current != null ? canvasRef.current.getContext("2d") : null,
    [canvasRef.current]
  );

  audioCtx.resume();
  useEffect(() => {
    if (canvasCtx === null) return;
    if (analyzer === undefined) return;
    if (canvasRef.current === null) return;

    const canvas = canvasRef.current
    const width = canvas.width
    const height = canvas.height

    const drawTimeData = (dataArray : Uint8Array, canvasCtx : CanvasRenderingContext2D) => {
      canvasCtx.lineWidth = 2
      canvasCtx.strokeStyle = "rgba(255, 255, 0, 0.5)"

      canvasCtx.beginPath()
      const sliceWidth = (width * 1.0) / dataArray.length
      let x = 0
      for (let i = 0; i < dataArray.length; i++, x += sliceWidth) {
        let value = dataArray[i] / 128.0
        let y = (value * height) / 2
        if (i === 0) {
          canvasCtx.moveTo(x, y)
        } else {
          canvasCtx.lineTo(x, y);
        }
      }
      canvasCtx.lineTo(width, height / 2);
      canvasCtx.stroke();
    }

    const draw = () => {
      canvasCtx.clearRect(0, 0, width, height);
      canvasCtx.fillStyle = "rgb(200, 200, 200, 0.25)";
      canvasCtx.fillRect(0, 0, width, height);

      let dataArray : Uint8Array;
      if (true) {
        analyzer.fftSize = 512

        dataArray = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteTimeDomainData(dataArray);
        drawTimeData(dataArray, canvasCtx)

        analyzer.getByteFrequencyData(dataArray);
        const barWidth = (width / dataArray.length)
        let x = 0
        for (let i = 0; i < dataArray.length; i +=4, x += (barWidth*4+1)) {
          let value = 
            (dataArray[i+0] + dataArray[i+1]  + dataArray[i+2]  + dataArray[i+3])/4.0
          let y = value / 256 * height;

          let a = 1
          let h = i * 256*3/2 / dataArray.length;

          canvasCtx.fillStyle = `hsla(${h}, 100%, 50%, ${a})`
          canvasCtx.fillRect(x, height - y, barWidth*4, height)
        }
      }

      requestAnimationFrame(draw);
    };
    draw();
  }, [audioCtx, analyzer, canvasCtx, canvasRef]);

  return (
    <Fragment>
        <canvas ref={canvasRef}  style={{display:'block', width:'90vw', height:'auto'}}></canvas>
    </Fragment>
  );
};

const App: React.FC = () => {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
      </header>
      <div className="App-main">
        <PermissionSwitch permissionDescription={{ name: "microphone" }}>
          <PermissionWhen state="granted">
            <div>Granted</div>
            <AudioPage />
          </PermissionWhen>
          <PermissionWhen state="denied">
            <div>Denied</div>
          </PermissionWhen>
          <PermissionWhen state="prompt">
            <div>Prompt</div>
            <AudioPage />
          </PermissionWhen>
        </PermissionSwitch>
      </div>
      <footer className="App-footer">
        {config.name} - {config.version}
      </footer>
    </div>
  );
};

export default App;

