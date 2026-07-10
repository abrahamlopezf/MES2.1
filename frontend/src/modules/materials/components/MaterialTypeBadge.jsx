import { TFBadge } from '../../../components/tf-ui';
import { getMaterialTypeLabel, getMaterialTypeTone } from '../constants/materialsUi';

const MaterialTypeBadge = ({ type }) => {
  return (
    <TFBadge variant={getMaterialTypeTone(type)}>
      {getMaterialTypeLabel(type)}
    </TFBadge>
  );
};

export default MaterialTypeBadge;