import React, { PureComponent } from 'react'
import { Translate } from 'react-redux-i18n'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { RaisedButton } from 'material-ui'
import { TextField } from 'redux-form-material-ui'
import { Field, reduxForm } from 'redux-form/immutable'
import './RevokeForm.scss'
import { revokeAsset } from 'redux/assetsManager/actions'
import validate from './validate'

function prefix (token) {
  return `Assets.RevokeForm.${token}`
}

export const FORM_NAME = 'RevokeDialog'

function mapStateToProps (state) {
  const form = state.get('form')
  const assetsManager = state.get('assetsManager')
  return {
    formErrors: form.get(FORM_NAME) && form.get(FORM_NAME).get('syncErrors'),
    selectedToken: assetsManager.selectedToken,
    tokensMap: assetsManager.tokensMap,
  }
}

const onSubmit = (values, dispatch, props) => {
  dispatch(revokeAsset(props.tokensMap.get(props.selectedToken), values.get('amount')))
}

@connect(mapStateToProps)
@reduxForm({ form: FORM_NAME, validate, onSubmit })
export default class AddPlatformForm extends PureComponent {
  static propTypes = {
    handleSubmit: PropTypes.func,
    formErrors: PropTypes.object,
    onSubmitSuccess: PropTypes.func,
    selectedToken: PropTypes.string,
  }

  render () {
    return (
      <form styleName='content' onSubmit={this.props.handleSubmit}>
        <div styleName='dialogHeader'>
          <div styleName='dialogHeaderStuff'>
            <div styleName='dialogHeaderTitle'>
              <Translate value={prefix('dialogTitle')} />
            </div>
          </div>
        </div>
        <div styleName='dialogBody'>

          <Field
            component={TextField}
            name='amount'
            fullWidth
            floatingLabelText={<Translate value={prefix('amount')} />}
          />

        </div>
        <div styleName='dialogFooter'>
          <RaisedButton
            disabled={!!this.props.formErrors}
            styleName='action'
            label={<Translate value={prefix('dialogTitle')} />}
            type='submit'
            primary
          />
        </div>
      </form>
    )
  }
}
