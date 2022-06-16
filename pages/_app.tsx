import { InstantBandit } from '../components/InstantBanditComponent';

import '../styles/globals.css';


function MyApp({ Component, pageProps }) {
  return (
    <InstantBandit siteName={"demo"}>
      <Component {...pageProps} />
    </InstantBandit>
  );
}

export default MyApp;
