import { AggregateRoot } from '@shared/domain/AggregateRoot';
import { LabelFormat } from '../valueObjects/PrintPipelineValueObjects';

export class LabelTemplate extends AggregateRoot<string> {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly format: LabelFormat,
    public readonly rawContent: string,
    public readonly variables: string[],
    public readonly version: number
  ) {
    super();
  }

  public static create(
    id: string,
    name: string,
    format: LabelFormat,
    rawContent: string,
    variables: string[]
  ): LabelTemplate {
    return new LabelTemplate(id, name, format, rawContent, variables, 1);
  }

  public render(data: Record<string, string>): string {
    let rendered = this.rawContent;
    for (const variable of this.variables) {
      const value = data[variable] || '';
      rendered = rendered.replace(`{{${variable}}}`, value);
    }
    return rendered;
  }
}
