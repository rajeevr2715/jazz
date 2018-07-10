import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import * as _ from "lodash";

@Component({
  selector: 'filter-modal',
  templateUrl: './filter-modal.component.html',
  styleUrls: ['./filter-modal.component.scss']
})
export class FilterModalComponent implements OnInit {
  @Output() formChange = new EventEmitter();
  @Input() fields;
  @Input() options;

  public form = {
    columns: []
  };
  public opened = false;

  constructor() {
  }

  ngOnInit() {
    let columns = _(this.fields)
      .groupBy('column')
      .map((column, key, array) => {
        return {
          label: key,
          fields: column
        }
      })
      .value();
    this.form.columns = columns
  }

  reset() {
    this.ngOnInit();
  }

  changeFilter(filterSelected, filterField) {
    filterField.selected = filterSelected;
    this.formChange.emit(filterField);
  }

  getFieldValueOfLabel(fieldLabel) {
    let foundField = this.getAllFields().find((field) => {
      return field.label === fieldLabel
    });
    let value = foundField.values[foundField.options.findIndex((option) => {
      return option === foundField.selected;
    })];

    return value;
  }

  getAllFields() {
    return this.form.columns.reduce((accumulator, column) => {
      return accumulator.concat(column.fields)
    }, []);
  }

  toggleModal() {
    this.opened = !this.opened;
  }

  addField(column, label, options, values?) {
    let columnIndex = _.findIndex(this.form.columns, {label: column});

    let field = {
      column: column,
      label: label,
      options: options,
      values: values || options,
      selected: options[0]
    };
    this.form.columns[columnIndex].fields.push(field);
  }
}
