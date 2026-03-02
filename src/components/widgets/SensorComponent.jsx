import React from "react";
import useEntity from "../../hooks/useEntity";
import { evaluateValueTemplate } from "../../utils/templateEvaluator";
import { AutoScalableText } from "./AutoScalableText";
import { ModernWidgetCard } from "./ModernWidgetCard";
import { SparklineGraph } from "./SparklineGraph";

const SensorComponent = ({ componentConfig }) => {
  const entity = useEntity(componentConfig.id);
  const rawValue = entity?.value;
  const template = entity?.val_tpl || componentConfig?.value_template;

  const displayValue = evaluateValueTemplate(template, rawValue);
  
  const unit =
    entity?.unit_of_meas ||
    entity?.unit_of_measurement ||
    componentConfig?.unit_of_meas ||
    componentConfig?.unit_of_measurement ||
    "";
    
  const lastUpdated = entity?.last_updated
    ? new Date(entity.last_updated).toLocaleTimeString()
    : "Невідомо";

  const label = componentConfig.label || entity?.name || "Сенсор";
  const topic = entity?.state_topic || componentConfig?.state_topic || componentConfig?.stat_t;

  return (
    <ModernWidgetCard title={label} highlightColor="#4fc3f7">
      <AutoScalableText 
        text={displayValue ?? "---"} 
        unit={unit} 
        subText={`Оновлено: ${lastUpdated}`}
        color="text.primary" 
        sx={{ zIndex: 1 }}
      />
      {topic && <SparklineGraph brokerId={componentConfig.brokerId} topic={topic} color="#4fc3f7" />}
    </ModernWidgetCard>
  );
};

export default SensorComponent;
