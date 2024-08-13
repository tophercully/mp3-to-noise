import AudioToNoiseConverter from "./components/AudioToNoiseConverter";
import Page from "./components/page";

function App() {
  return (
    <Page>
      <div className="flex h-full w-full items-center justify-center">
        <AudioToNoiseConverter />
        {/* <h1 className="w-fit">Vite + React + TS + Tailwind + Prettier</h1> */}
      </div>
    </Page>
  );
}

export default App;
