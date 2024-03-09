import {Trans} from "react-i18next";
import {useEffect, useMemo, useState} from "react";
import {useStore} from "../store/store.ts";
import {PadSearchQuery, PadSearchResult} from "../utils/PadSearch.ts";
import {useDebounce} from "../utils/useDebounce.ts";
import {determineSorting} from "../utils/sorting.ts";

export const PadPage = ()=>{
    const settingsSocket = useStore(state=>state.settingsSocket)
    const [searchParams, setSearchParams] = useState<PadSearchQuery>({
        offset: 0,
        limit: 12,
        pattern: '',
        sortBy: 'padName',
        ascending: true
    })

    const [searchTerm, setSearchTerm] = useState<string>('')
    const pads = useStore(state=>state.pads)
    const pages = useMemo(()=>{
        if(!pads){
            return [0]
        }

        const totalPages = Math.ceil(pads!.total / searchParams.limit)
        return Array.from({length: totalPages}, (_, i) => i+1)
    },[pads])

    useDebounce(()=>{
        setSearchParams({
            ...searchParams,
            pattern: searchTerm
        })

    }, 500, [searchTerm])

    useEffect(() => {
        if(!settingsSocket){
            return
        }

        settingsSocket.emit('padLoad', searchParams)

    }, [settingsSocket, searchParams]);

    useEffect(() => {
        if(!settingsSocket){
            return
        }

        settingsSocket.on('results:padLoad', (data: PadSearchResult)=>{
            useStore.getState().setPads(data);
        })


        settingsSocket.on('results:deletePad', (padID: string)=>{
            const newPads = useStore.getState().pads?.results?.filter((pad)=>{
                return pad.padName !== padID
            })
            useStore.getState().setPads({
                total: useStore.getState().pads!.total-1,
                results: newPads
            })
        })
    }, [settingsSocket, pads]);



    return <div>
        <h1><Trans i18nKey="ep_admin_pads:ep_adminpads2_manage-pads"/></h1>
        <input type="text" value={searchTerm} onChange={v=>setSearchTerm(v.target.value)} placeholder="Pads suchen"/>
        <table>
            <thead>
            <tr>
                <th className={determineSorting(searchParams.sortBy, searchParams.ascending, 'padName')} onClick={()=>{
                    setSearchParams({
                        ...searchParams,
                        sortBy: 'padName',
                        ascending: !searchParams.ascending
                    })
                }}>PadId</th>
                <th className={determineSorting(searchParams.sortBy, searchParams.ascending, 'lastEdited')} onClick={()=>{
                    setSearchParams({
                        ...searchParams,
                        sortBy: 'lastEdited',
                        ascending: !searchParams.ascending
                    })
                }}>Users</th>
                <th className={determineSorting(searchParams.sortBy, searchParams.ascending, 'userCount')} onClick={()=>{
                    setSearchParams({
                        ...searchParams,
                        sortBy: 'userCount',
                        ascending: !searchParams.ascending
                    })
                }}>Last Edited</th>
                <th className={determineSorting(searchParams.sortBy, searchParams.ascending, 'revisionNumber')} onClick={()=>{
                    setSearchParams({
                        ...searchParams,
                        sortBy: 'revisionNumber',
                        ascending: !searchParams.ascending
                    })
                }}>Revision number</th>
                <th>Actions</th>
            </tr>
            </thead>
            <tbody>
            {
                pads?.results?.map((pad)=>{
                    return <tr key={pad.padName}>
                        <td style={{textAlign: 'center'}}>{pad.padName}</td>
                        <td style={{textAlign: 'center'}}>{pad.userCount}</td>
                        <td style={{textAlign: 'center'}}>{new Date(pad.lastEdited).toLocaleString()}</td>
                        <td style={{textAlign: 'center'}}>{pad.revisionNumber}</td>
                        <td>
                            <div className="settings-button-bar">
                                <button onClick={()=>{
                                    settingsSocket?.emit('deletePad', pad.padName)
                                }}>delete</button>
                                <button onClick={()=>{
                                    window.open(`/p/${pad.padName}`, '_blank')
                                }}>view</button>
                            </div>
                        </td>
                    </tr>
                })
            }
            </tbody>
        </table>
        <div className="settings-button-bar">
            {pages.map((page)=>{
                return <button key={page} onClick={()=>{
                    setSearchParams({
                        ...searchParams,
                        offset: (page-1)*searchParams.limit
                    })
                }}>{page}</button>
            })}
        </div>
    </div>
}
