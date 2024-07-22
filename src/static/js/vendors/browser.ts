// WARNING: This file may have been modified from original.
// TODO: Check requirement of this file, this afaik was to cover weird edge cases
// that have probably been fixed in browsers.

/*!
  * Bowser - a browser detector
  * https://github.com/ded/bowser
  * MIT License | (c) Dustin Diaz 2015
  */



export class BrowserDetector {
  webos?: boolean
  name: string = ''
  opera?: boolean
  version?: string
  yandexbrowser?: boolean
  windowsphone?: boolean
  msedge?: boolean
  msie?: boolean
  chromeos?: boolean
  chromeBook?: boolean
  chrome?: boolean
  sailfish?: boolean
  seamonkey?: boolean
  firefox?: boolean
  firefoxos?: boolean
  silk?: boolean
  phantom?: boolean
  blackberry?: boolean
  touchpad?: boolean
  bada?: boolean
  tizen?: boolean
  safari?: boolean
  webkit?: boolean
  gecko?: boolean
  android?: boolean
  ios?: boolean
  windows?: boolean
  mac?: boolean
  linux?: boolean
  osversion?: string
  tablet?: boolean
  mobile?: boolean
  a?: boolean
  c?: boolean
  x?: boolean
  touchepad?: boolean
  constructor() {
    this.detect(typeof navigator !== 'undefined' ? navigator.userAgent : '')
  }
  private getFirstMatch = (regex: RegExp, ua:string)=> {
    const match = ua.match(regex);
    return (match && match.length > 1 && match[1]) || '';
  }

  public detect = (ua: string)=>{
    let iosdevice = this.getFirstMatch(/(ipod|iphone|ipad)/i, ua).toLowerCase()
    let likeAndroid = /like android/i.test(ua)
    let android = !likeAndroid && /android/i.test(ua)
    let chromeos = /CrOS/.test(ua)
      , silk = /silk/i.test(ua)
      , sailfish = /sailfish/i.test(ua)
      , tizen = /tizen/i.test(ua)
      , webos = /(web|hpw)os/i.test(ua)
      , windowsphone = /windows phone/i.test(ua)
      , windows = !windowsphone && /windows/i.test(ua)
      , mac = !iosdevice && !silk && /macintosh/i.test(ua)
      , linux = !android && !sailfish && !tizen && !webos && /linux/i.test(ua)
      , edgeVersion = this.getFirstMatch(/edge\/(\d+(\.\d+)?)/i, ua)
      , versionIdentifier = this.getFirstMatch(/version\/(\d+(\.\d+)?)/i, ua)
      , tablet = /tablet/i.test(ua)
      , mobile = !tablet && /[^-]mobi/i.test(ua)


    if (/opera|opr/i.test(ua)) {
        this.name =  'Opera'
      this.opera =  true
      this.version =  versionIdentifier || this.getFirstMatch(/(?:opera|opr)[\s\/](\d+(\.\d+)?)/i, ua)
    }
    else if (/yabrowser/i.test(ua)) {
      this.name =  'Yandex Browser'
      this.yandexbrowser =  true
      this.version =  versionIdentifier || this.getFirstMatch(/(?:yabrowser)[\s\/](\d+(\.\d+)?)/i, ua)
      }
    else if (windowsphone) {
      this.name =  'Windows Phone'
      this.windowsphone =  true
      if (edgeVersion) {
        this.msedge = true
        this.version = edgeVersion
      }
      else {
        this.msie = true
        this.version = this.getFirstMatch(/iemobile\/(\d+(\.\d+)?)/i, ua)
      }
    }
    else if (/msie|trident/i.test(ua)) {
      this.name = 'Internet Explorer'
      this.msie =  true
      this.version =  this.getFirstMatch(/(?:msie |rv:)(\d+(\.\d+)?)/i, ua)
    }  else if (chromeos) {
      this.name = 'Chrome';
      this.chromeos = true;
      this.chromeBook = true;
      this.chrome = true;
      this.version = this.getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.\d+)?)/i, ua);
    } else if (/chrome.+? edge/i.test(ua)) {
      this.name = 'Microsoft Edge';
      this.msedge = true;
      this.version = edgeVersion;
    } else if (/chrome|crios|crmo/i.test(ua)) {
      this.name = 'Chrome';
      this.chrome = true;
      this.version = this.getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.\d+)?)/i, ua);
    } else if (iosdevice) {
      this.name = iosdevice === 'iphone' ? 'iPhone' : iosdevice === 'ipad' ? 'iPad' : 'iPod';
      if (versionIdentifier) {
        this.version = versionIdentifier;
      }
    } else if (webos) {
      this.name = 'WebOS';
      this.webos = true;
      this.version = versionIdentifier || this.getFirstMatch(/w(?:eb)?osbrowser\/(\d+(\.\d+)?)/i, ua);
      /touchpad\//i.test(ua) && (this.touchepad = true);
    } else if (android) {
      this.name = 'Android';
      this.version = versionIdentifier;
    } else if (/safari/i.test(ua)) {
      this.name = 'Safari';
      this.safari = true;
      this.version = versionIdentifier;
    } else {
      this.name = this.getFirstMatch(/^(.*)\/(.*) /, ua);
      this.version = this.getSecondMatch(/^(.*)\/(.*) /, ua);
    }

    if (!this.msedge && /(apple)?webkit/i.test(ua)) {
      this.name = this.name || "Webkit";
      this.webkit = true;
      if (!this.version && versionIdentifier) {
        this.version = versionIdentifier;
      }
    } else if (/gecko\//i.test(ua) && !this.webkit && !this.msedge) {
      this.name = this.name || "Gecko";
      this.gecko = true;
      this.version = this.version || this.getFirstMatch(/gecko\/(\d+(\.\d+)?)/i, ua);
    }

    if (!this.msedge && (android || this.silk)) {
      this.android = true;
    } else if (iosdevice) {
      // @ts-ignore
      this[iosdevice] = true;
      this.ios = true;
    } else if (windows) {
      this.windows = true;
    } else if (mac) {
      this.mac = true;
    } else if (linux) {
      this.linux = true;
    }

    let osVersion = '';
    if (iosdevice) {
      osVersion = this.getFirstMatch(/os (\d+([_\s]\d+)*) like mac os x/i, ua).replace(/[_\s]/g, '.');
    } else if (android) {
      osVersion = this.getFirstMatch(/android[ \/-](\d+(\.\d+)*)/i, ua);
    } else if (this.webos) {
      osVersion = this.getFirstMatch(/(?:web|hpw)os\/(\d+(\.\d+)*)/i, ua);
    }

    osVersion && (this.osversion = osVersion);

    if (tablet || iosdevice === 'ipad' || (android && (osVersion.split('.')[0] === '3' || osVersion.split('.')[0] === '4' && !mobile)) || this.silk) {
      this.tablet = true;
    } else if (mobile || iosdevice === 'iphone' || iosdevice === 'ipod' || android) {
      this.mobile = true;
    }

    if (this.msedge ||
      (this.chrome && this.version && parseInt(this.version) >= 20) ||
      (this.firefox && this.version && parseInt(this.version) >= 20) ||
      (this.safari && this.version && parseInt(this.version) >= 6) ||
      (this.opera && this.version && parseInt(this.version) >= 10) ||
      (this.ios && this.osversion && parseInt(this.osversion.split(".")[0]) >= 6)
    ) {
      this.a = true;
    } else if ((this.chrome && this.version && parseInt(this.version) < 20) ||
      (this.firefox && this.version && parseInt(this.version) < 20) ||
      (this.safari && this.version && parseInt(this.version) < 6)
    ) {
      this.c = true;
    } else {
      this.x = true;
    }
  }

  private  getSecondMatch = (regex: RegExp, ua: string) => {
    const match = ua.match(regex);
    return (match && match.length > 1 && match[2]) || '';
  }

  test =  (browserList: string)=> {
    for (let i = 0; i < browserList.length; ++i) {
      const browserItem = browserList[i];
      if (typeof browserItem=== 'string') {
        if (browserItem in this) {
          return true;
        }
      }
    }
    return false;
  }
}

const browser = new BrowserDetector()
export default browser
