import { Component } from 'react';
import { cloneDeep } from 'lodash';

export default class Base extends Component {
    linkState(path) {
        const keys = path.split('.');

        return {
            value: keys.reduce((state, key) => state[key], this.state),
            requestChange: newValue => this.setDeepState({ [path]: newValue})
        }
    }

    linkRadioState(path, value) {
        const link = this.linkState(path);

        return {
            value: link.value === value,
            requestChange: link.requestChange.bind(this, value)
        };
    }

    setDeepState(newState) {
        const state = cloneDeep(this.state);

        Object.keys(newState).forEach(path => {
            const newValue = newState[path];
            const keys = path.split('.');

            keys.reduce((state, key, index) => {
                const currentValue = state[key];

                return state[key] = index === keys.length - 1 ? newValue : (currentValue == null ? {} : currentValue)
            }, state);
        });

        this.setState(state);
    }
}