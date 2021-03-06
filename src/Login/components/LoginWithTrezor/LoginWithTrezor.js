import { CircularProgress, RaisedButton } from 'material-ui'
import PropTypes from 'prop-types'
import React, { PureComponent } from 'react'
import { connect } from 'react-redux'
import { Translate } from 'react-redux-i18n'
import BackButton from '../../components/BackButton/BackButton'
import { fetchAccount, startTrezorSync, stopTrezorSync } from '../../redux/trezor/actions'

import './LoginWithTrezor.scss'

const trezorStates = [ {
  flag: 'isHttps',
  successTitle: 'LoginWithTrezor.isHttps.successTitle',
  errorTitle: 'LoginWithTrezor.isHttps.errorTitle',
  errorTip: 'LoginWithTrezor.isHttps.errorTip',
}, {
  flag: 'isU2F',
  successTitle: 'LoginWithTrezor.isU2F.successTitle',
  errorTitle: 'LoginWithTrezor.isU2F.errorTitle',
  errorTip: 'LoginWithTrezor.isU2F.errorTip',
}, {
  flag: 'isFetched',
  successTitle: 'LoginWithTrezor.isFetched.successTitle',
  errorTitle: 'LoginWithTrezor.isFetched.errorTitle',
  errorTip: 'LoginWithTrezor.isFetched.errorTip',
} ]

const mapStateToProps = (state) => {
  const network = state.get('network')
  return {
    trezor: state.get('trezor'),
    isLoading: network.isLoading,
    account: network.selectedAccount,
  }
}

const mapDispatchToProps = (dispatch) => ({
  startTrezorSync: () => dispatch(startTrezorSync()),
  stopTrezorSync: (isReset) => dispatch(stopTrezorSync(isReset)),
  fetchAccount: () => dispatch(fetchAccount()),
})

@connect(mapStateToProps, mapDispatchToProps)
class LoginTrezor extends PureComponent {
  static propTypes = {
    startTrezorSync: PropTypes.func,
    stopTrezorSync: PropTypes.func,
    fetchAccount: PropTypes.func,
    onBack: PropTypes.func.isRequired,
    onLogin: PropTypes.func.isRequired,
    trezor: PropTypes.object,
    isLoading: PropTypes.bool,
    account: PropTypes.string,
  }

  componentWillMount () {
    this.props.startTrezorSync()
  }

  componentWillUnmount () {
    this.props.stopTrezorSync()
  }

  componentWillReceiveProps ({ trezor }) {
    if (!trezor.isFetched && !trezor.isFetching && trezor.isHttps && trezor.isU2F) {
      this.props.fetchAccount()
    }
  }

  handleBackClick = () => {
    this.props.stopTrezorSync(true)
    this.props.onBack()
  }

  renderStates () {
    const { trezor } = this.props

    return trezorStates.map((item) => trezor[ item.flag ]
      ? (
        <div styleName='state' key={item.flag}>
          <div styleName='flag flagDone' className='material-icons'>done</div>
          <div styleName='titleContent'><Translate value={item.successTitle} /></div>
        </div>
      )
      : (
        <div styleName='state' key={item.flag}>
          <div styleName='flag flagError' className='material-icons'>error</div>
          <div styleName='titleContent'>
            <div styleName='title'><Translate value={item.errorTitle} /></div>
            <div styleName='subtitle'><Translate value={item.errorTip} /></div>
          </div>
        </div>
      ))
  }

  render () {
    const { isLoading, trezor, account } = this.props

    return (
      <div styleName='root'>
        <BackButton
          onClick={this.handleBackClick}
          to='options'
        />

        <div styleName='states'>
          {this.renderStates()}
        </div>

        {trezor.isFetched && (
          <div styleName='account'>
            <div styleName='accountLabel'><Translate value='LoginWithTrezor.ethAddress' /></div>
            <div styleName='accountValue'>{account}</div>
          </div>
        )}

        <div styleName='actions'>
          <div styleName='action'>
            <RaisedButton
              label={isLoading
                ? (
                  <CircularProgress
                    style={{ verticalAlign: 'middle', marginTop: -2 }}
                    size={24}
                    thickness={1.5}
                  />
                )
                : <Translate value='LoginWithTrezor.login' />
              }
              primary
              fullWidth
              disabled={isLoading || !account}
              onTouchTap={() => this.props.onLogin()}
            />
          </div>
        </div>
      </div>
    )
  }
}

export default LoginTrezor
