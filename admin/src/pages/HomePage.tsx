import {useStore} from "../store/store.ts";
import {useEffect, useState} from "react";
import {PluginDef} from "./Plugin.ts";

export const HomePage = () => {
    const pluginsSocket = useStore(state=>state.pluginsSocket)
    const [limit, setLimit] = useState(20)
    const [offset, setOffset] = useState(0)
    const [plugins,setPlugins] = useState<PluginDef[]>([])

    useEffect(() => {
        pluginsSocket?.emit('search', {
            searchTerm: '',
            offset: offset,
            limit: limit,
            sortBy: 'name',
            sortDir: 'asc'
        })
        setOffset(offset+limit)

        pluginsSocket!.on('results:search', (data) => {
          setPlugins(data.results)
        })
    }, []);

    return <div>
        <h1>Home Page</h1>
        <table>
            <thead>
            <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Action</th>
            </tr>
            </thead>
            <tbody>
            {plugins.map((plugin, index) => {
                return <tr key={index}>
                    <td>{plugin.name}</td>
                    <td>{plugin.description}</td>
                    <td>test</td>
                </tr>
            })}
            </tbody>
        </table>

    </div>
}
