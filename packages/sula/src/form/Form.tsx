import React from 'react';
import { Form as AForm, Spin } from 'antd';
import omit from 'lodash/omit';
import { FormProps as AFormProps, FormInstance as AFormInstance } from 'antd/lib/form';
import {FieldGroupProps} from './FieldGroup';
import FieldGroupContext, { rootGroupName, HOOK_MARK } from './FieldGroupContext';
import { getItemLayout } from './utils/layoutUtil';
import { NormalizedItemLayout } from './FieldGroup';
import { FieldGroup } from '.';
import useFormContext from './useFormContext';
import FormDependency from './dependency';
import { triggerActionPlugin } from '../rope/triggerPlugin';
import MediaQueries from './MediaQueries';
import { RequestConfig } from '../types/request';
import { FieldNamePath } from '../types/form';

export interface FormProps extends Omit<AFormProps, 'children'>, Omit<FieldGroupProps, 'name' | 'initialVisible' | 'dependency'> {
  remoteValues?: RequestConfig;
  ctxGetter?: () => Record<string, any>;
}

export interface FormInstance extends AFormInstance {
  validateFields: (nameList?: FieldNamePath[] | true) => Promise<any>;
  validateGroupFields: (groupName: string) => Promise<any>;
  setFieldValue: (name: FieldNamePath, value: any) => void;
  setFieldSource: (name: FieldNamePath, source: any) => void;
  setFieldVisible: (name: FieldNamePath, visible: boolean) => void;
  setFieldDisabled: (name: FieldNamePath, disabled: boolean) => void;
  getFieldSource: (name: FieldNamePath) => any;
  getFieldDisabled: (name: FieldNamePath) => any;
}

const Form: React.FC<FormProps> = (props, ref) => {
  const [formInstance] = AForm.useForm();

  const [context] = useFormContext(formInstance);

  React.useImperativeHandle(ref, context.getForm);

  const [loading, setLoading] = React.useState(false);

  const { saveFormProps, saveFormDependency, cascade, getCtx } = context.getInternalHooks(
    HOOK_MARK,
  );

  const formDependencyRef = React.useRef(new FormDependency());

  saveFormDependency(formDependencyRef.current);

  saveFormProps(props);

  const {
    layout = 'horizontal',
    itemLayout,
    size = 'middle',
    mode,
    remoteValues,
    initialValues,
    container,
    fields,
    children,
    actionsRender,
    actionsPosition,
  } = props;

  React.useEffect(() => {
    const ctx = getCtx();
    if (initialValues) {
      ctx.form.setFieldsValue(initialValues);
    }

    if (mode !== 'create' && remoteValues && remoteValues.init !== false) {
      setLoading(true);
      triggerActionPlugin(ctx, remoteValues)
        .then((fieldsValue: any) => {
          ctx.form.setFieldsValue(fieldsValue);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, []);

  const finalChildren = fields ? (
    <FieldGroup
      fields={fields}
      container={container}
      actionsRender={actionsRender}
      actionsPosition={actionsPosition}
    />
  ) : (
    children
  );

  const formProps = omit(props, [
    'itemLayout',
    'mode',
    'remoteValues',
    'container',
    'fields',
    'children',
    'actionsRender',
    'actionsPosition',
    'ctxGetter',
  ]);

  const originValuesChange = formProps.onValuesChange;

  formProps.onValuesChange = (changedValue, allValues) => {
    cascade(changedValue);
    if (originValuesChange) {
      originValuesChange(changedValue, allValues);
    }
  };

  return (
    <MediaQueries>
      {(matchedPoint) => {
        const normalizedItemLayout: NormalizedItemLayout = getItemLayout(
          itemLayout,
          layout,
          matchedPoint,
        );
        const fieldGroupContext = {
          formContext: context,
          layout,
          itemLayout: normalizedItemLayout,
          parentGroupName: rootGroupName,
          size,
          matchedPoint,
        };
        const wrapperChildren = (
          <FieldGroupContext.Provider value={fieldGroupContext}>
            {finalChildren}
          </FieldGroupContext.Provider>
        );

        return (
          <Spin spinning={loading}>
            <AForm
              {...formProps}
              wrapperCol={normalizedItemLayout.wrapperCol}
              labelCol={normalizedItemLayout.labelCol}
              children={wrapperChildren}
              form={formInstance}
            />
          </Spin>
        );
      }}
    </MediaQueries>
  );
};

export default Form;
