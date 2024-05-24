import {Trans} from "react-i18next";
import {useStore} from "../store/store.ts";
import {useEffect, useState} from "react";
import {HelpObj} from "./Plugin.ts";
import {HistoryIcon, ArrowUpFromDotIcon, HashIcon, UnplugIcon, PuzzleIcon, WebhookIcon, LucideWebhook} from 'lucide-react'

export const HelpPage = () => {
  const settingsSocket = useStore(state => state.settingsSocket)
  const [helpData, setHelpData] = useState<HelpObj>();

  useEffect(() => {
    if (!settingsSocket) return;
    settingsSocket?.on('reply:help', (data) => {
      setHelpData(data)
    });

    settingsSocket?.emit('help');
  }, [settingsSocket]);

  const renderHooks = (hooks: Record<string, Record<string, string>>) => {
    return Object.keys(hooks).map((hookName, i) => {
      return <div key={hookName + i}>
        <h3>{hookName}</h3>
        <ul>
          {Object.keys(hooks[hookName]).map((hook, i) => <li key={hook + i}>{hook}
            <ul key={hookName + hook + i}>
              {Object.keys(hooks[hookName][hook]).map((subHook, i) => <li key={i}>{subHook}</li>)}
            </ul>
          </li>)}
        </ul>
      </div>
    })
  }


  if (!helpData) return <div></div>

  return <div>
    <h1><Trans i18nKey="admin_plugins_info.version"/></h1>
    <div className="help-block">
      <div>
        <div>
          <Trans i18nKey="admin_plugins_info.version_number"/>
        </div>
        <div>
          {helpData.epVersion}
        </div>
        <HistoryIcon/>
      </div>
      <div>
        <div>
          <Trans i18nKey="admin_plugins_info.version_latest"/>
        </div>
        <div>{helpData.latestVersion}</div>
        <ArrowUpFromDotIcon/>
      </div>
      <div>
        <div>
          Git sha
        </div>
        <div>
          {helpData.gitCommit}
        </div>
        <HashIcon/>
      </div>
    </div>
    <h2><Trans i18nKey="admin_plugins.installed"/> <UnplugIcon/></h2>
    <ul>
      {helpData.installedPlugins.map((plugin, i) => <li key={plugin + i}>{plugin}</li>)}
    </ul>

    <h2><Trans i18nKey="admin_plugins_info.parts"/> <PuzzleIcon/></h2>
    <ul>
      {helpData.installedParts.map((part, i) => <li key={part + i}>{part}</li>)}
    </ul>

    <h2><Trans i18nKey="admin_plugins_info.hooks"/> <WebhookIcon/></h2>
    {
      renderHooks(helpData.installedServerHooks)
    }

    <h2>
      <Trans i18nKey="admin_plugins_info.hooks_client"/> <LucideWebhook/>

    </h2>
    <div>
      {
        renderHooks(helpData.installedClientHooks)
      }
    </div>

  </div>
}
