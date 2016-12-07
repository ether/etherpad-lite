import React, { Component } from 'react';
import Base from '../Base.react';

export default class Avatar extends Base {
    static propTypes = {
        image: React.PropTypes.string,
        isForceCache: React.PropTypes.bool
    }

    constructor(props) {
        super(props);
        this.state = { timestamp: props.isForceCache ? new Date().getTime() : '' };
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.isForceCache && this.props.image !== nextProps.image) {
            this.setState({ timestamp: new Date().getTime() });
        }
    }

    render() {
        const image = this.props.image;
        let imageURL = '/images/default-avatar.png';

        if (image) {
            if (/^data\:|http/.test(image)) {
                imageURL = image;
            } else {
                imageURL = `https://open-companies.storage.googleapis.com/${image}`;

                if (imageURL.indexOf('?') === -1) {
                    imageURL += '?' + this.state.timestamp;
                }
            }
        }

        return (
            <div className='avatar'>
                <img className='avatar__el' src={imageURL} />
                <img className='avatar__placeholder' src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQI12P4zwAAAgEBAKrChTYAAAAASUVORK5CYII=' />
            </div>
        );
    }
}