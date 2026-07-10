import { TFBadge } from '../../../components/tf-ui';
import { getQrStatusLabel, getQrStatusTone } from '../constants/qrUi';

const QrStatusBadge = ({ status }) => {
  return (
    <TFBadge variant={getQrStatusTone(status)}>
      {getQrStatusLabel(status)}
    </TFBadge>
  );
};

export default QrStatusBadge;