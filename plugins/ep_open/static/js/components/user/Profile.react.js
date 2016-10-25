import window from 'global';
import React, { Component } from 'react';
import { branch } from 'baobab-react/decorators';
import classNames from 'classnames';
import { Link } from 'react-router';
import Dropzone from 'react-dropzone';
import AvatarEditor from 'react-avatar-editor';
import Base from '../Base.react';
import Avatar from '../common/Avatar.react';
import Spinner from '../common/Spinner.react';
import * as actions from '../../actions/user';

@branch({
    cursors: {
        user: ['currentUser'],
        userSync: ['userSync']
    },
    actions
})
export default class Profile extends Base {
    static contextTypes = {
        router: React.PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            user: Object.assign({}, props.user),
            avatarPreview: '',
            avatarScale: 1,
            avatarUploading: false
        };
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.user !== nextProps.user) {
            this.setState({
                user: Object.assign({}, nextProps.user),
                avatarUploading: false
            });
        }
    }

    submit(event) {
        event.preventDefault();
        const data = {};

        ['email', 'nickname'].forEach(key => data[key] = this.state.user[key]);
        this.props.actions.updateProfile(data);
    }

    handleScale() {
        this.setState({ avatarScale: parseFloat(this.refs.scale.value) });
    }

    handleFileDrop(files) {
        const file = files[0];

        if (file) {
            const fileReader = new FileReader();

            fileReader.onload = event => {
                this.setState({
                    avatarPreview: event.target.result
                });
            };
            fileReader.readAsDataURL(file);
        }
    }

    uploadAvatar() {
        const image = this.refs.avatarEditor.getImage()

        this.props.actions.uploadAvatar(image);

        this.setState({
            avatarPreview: null,
            avatarUploading: true,
            user: Object.assign({}, this.state.user, { avatar: image })
        });
    }

    render() {
        const user = this.state.user || {};

        if (!user.id) {
            return null;
        }

		return (
			<form className='form form--entrance' onSubmit={this.submit.bind(this)}>
                <h1 className='form__title'>Profile</h1>
                <div className='form__row'>
                    <Link to='/profile/password'>Change password</Link>
                </div>
                <div className='form__row'>
                    <div className='avatar__form'>
                        <Avatar image={user.avatar} />
                        <Dropzone
                            className="avatar__upload"
                            onDrop={this.handleFileDrop.bind(this)}
                            accept='image/png,image/jpg'
                            multiple={false} />
                        {this.state.avatarPreview ? (
                            <div className='avatar__editor'>
                                <AvatarEditor
                                    ref='avatarEditor'
                                    image={this.state.avatarPreview}
                                    width={200}
                                    height={200}
                                    border={0}
                                    scale={this.state.avatarScale} />
                                <button className='btn' onClick={this.uploadAvatar.bind(this)}>Save</button>
                                <input className='avatar__editor__scale' name="scale" type="range" ref="scale" onChange={this.handleScale.bind(this)} min="1" max="2" step="0.01" defaultValue="1" />
                            </div>
                        ) : ''}
                        <Spinner className={classNames('avatar__spinner', {
                            'hidden': !this.state.avatarUploading
                        })} />
                    </div>
                </div>
                <div className='form__row'>
                    <div className='form__row__title'>Email</div>
                    <div className='form__row__field'>
                        <input className='input' type='text' ref='email' valueLink={this.linkState('user.email')} />
                    </div>
                </div>
                <div className='form__row'>
                    <div className='form__row__title'>Nickname</div>
                    <div className='form__row__field'>
                        <input className='input' type='text' ref='nickname' valueLink={this.linkState('user.nickname')} />
                    </div>
                </div>
                <button className='btn form__btn' type='submit'>Save</button>
            </form>
		);
	}
}