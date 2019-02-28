<template>
<draggable
  :key="rerender"
  :options="draggableSettings"
  :list="fields"
  @start="startSort"
  @sort="add"
  @end="dragging = false"
  >
  <div class="row" v-for="field in fields" :key="field.field"

    >
    <div class="drag"><i class="material-icons">drag_handle</i></div>
    <div class="collapse" @click="expand(field.id)" v-if="field.children">
      <i class="material-icons">{{expanded[field.id]? 'expand_more' : 'chevron_right'}}</i>
    </div>
    <div class="inner row" @click.stop="startEditingField(field)">
      <div>
        {{ $helpers.formatTitle(field.field) }}
        <i
          v-tooltip="$t('required')"
          class="material-icons required"
          v-if="field.required === true || field.required === '1'"
          >star</i
        >
        <i
          v-tooltip="$t('primary_key')"
          class="material-icons key"
          v-if="field.primary_key"
          >vpn_key</i
        >
      </div>
      <div>
        {{
          ($store.state.extensions.interfaces[field.interface] &&
            $store.state.extensions.interfaces[field.interface].name) ||
            "--"
        }}
      </div>
    </div>
    <v-popover
      class="more-options"
      placement="left-start"
      v-if="canDuplicate(field.interface) || fields.length > 0"
    >
      <button type="button" class="menu-toggle">
        <i class="material-icons">more_vert</i>
      </button>
      <template slot="popover">
        <ul class="ctx-menu">
          <li>
            <button
              v-close-popover
              type="button"
              @click.stop="duplicateField(field)"
              :disabled="!canDuplicate(field.interface)"
            >
              <i class="material-icons">control_point_duplicate</i>
              {{ $t("duplicate") }}
            </button>
          </li>
          <li>
            <button
              v-close-popover
              :disabled="fields.length === 1"
              type="button"
              @click.stop="warnRemoveField(field)"
            >
              <i class="material-icons">close</i> {{ $t("delete") }}
            </button>
          </li>
        </ul>
      </template>
    </v-popover>
  
    <settings-field-list v-if="field.children && expanded[field.id]"
    :class="[
      'group',
      (field.children.length > 0? '' : 'empty' ),
      (dragging ? 'potential' : '')
      ]"
    :groupID="field.id"
    :fields="field.children"
    :draggableSettings="draggableSettings"
    :key="rerender"
    :expanded="expanded"
    @saveSort="saveSort"
    @warnRemoveField="warnRemoveField"
    @duplicateField="duplicateField"
    @startEditingField="startEditingField"
    @expanded="expand"
    />
  </div>

</draggable>
</template>

<script>
export default {
  name: "settings-field-list",
  props: {
    fields: {
      type: Array,
      required: true
    },
    groupID: {
      type: Number,
      required: false,
      default: null
    },
    expanded: {
      type: Object,
      required: false,
      default: null
    },
    draggableSettings: {
      type: Object,
      required: false,
      default: null
    }
  },
  computed: {
    hasChildren() {
      if (this.fields.children) {
        var num = Object.keys(this.fields.children).length;
        console.log("has children");
        return (num > 0 && num != null && num != undefined);
      }
      console.log("childless")
      return false;
    },
  },
  methods:{
    //new item appears in list
    add() {
       this.saveSort(this.fields.map((field, index) => ({
        field : field.field,
        sort : index,
        group : this.groupID
        }))
      );
    },
    update(){
      this.saveSort(this.fields.map((field, index) => ({
        field : field.field,
        sort : index,
        group : this.groupID
        }))
      );
    },
    log(){
      console.log(this.fields);
    },
    expand(ID){
      this.$emit('expanded', ID);
      this.rerender = !this.rerender; // hacky, force collapse visibility
    },
    startSort(){
      this.dragging = true;
      this.$emit('startSort');
    },
    startEditingField(field){
      this.$emit('startEditingField', field);
    },
    duplicateField(field){
      this.$emit('duplicateField', field);
    },
    warnRemoveField(fieldName){
      this.$emit('warnRemoveField', fieldName);
    },
    canDuplicate(fieldInterface) {
      return (
        this.duplicateInterfaceBlacklist.includes(fieldInterface) === false
      );
    },
    saveSort(updateFields) {
      this.$emit('saveSort', updateFields);
    },
    log(){
      console.log(this.fields);
    }
  },
  data(){
    return {
      duplicateInterfaceBlacklist: [
        "primary-key",
        "many-to-many",
        "one-to-many",
        "many-to-one",
        "sort"
      ],
      dragging: false,
      rerender: false,
    }
  }
}
</script>

<style lang="scss" scoped>
.group {
  display:flex;
  flex-flow:column nowrap;
  align-self:flex-start;
  flex:0 0 100%;
  border-left:2px var(--lighter-gray) solid;
  transition: padding var(--fast) var(--transition);

  &.potential {
    padding-bottom:1.5em;
    border-color:var(--accent);
  }
}
  .dragging .row:hover {
      background-color: var(--white);
  }

  .row {
    display: flex;
    flex-flow:row wrap;
    align-items: center;
    position:relative;
    cursor: pointer;
    position: relative;
    border-bottom: 1px solid var(--lightest-gray);
    padding: 6px 0 6px 6px;

    > div {
      
      border-bottom: none;
    }

    .inner{
    flex-grow: 1;

      > div {
        padding:0;
        flex-basis: 200px;
      }
    }


      &:last-of-type {
        border-bottom: none;
      }

      &:hover {
        background-color: var(--highlight);
      }

      .required {
        color: var(--accent);
        vertical-align: super;
        font-size: 7px;
      }

      .key {
        color: var(--light-gray);
        font-size: 16px;
        vertical-align: -3px;
        margin-left: 2px;
      }
    }

.drag {
  user-select: none;
  cursor: -webkit-grab;
  color: var(--lighter-gray);

  &:hover {
    color: var(--dark-gray);
  }
}

.collapse{
  padding-left:5px;
  color: var(--lighter-gray);

  &:hover {
    color: var(--dark-gray);
  }
}

.more-options {
  position: absolute;
  right: 0;
  top: 0.5em;
  padding-right: 5px;

  i {
    color: var(--lighter-gray);
    transition: color var(--fast) var(--transition);
  }

  &:hover {
    i {
      transition: none;
      color: var(--gray);
    }
  }
}

.ctx-menu {
  list-style: none;
  padding: 0;
  width: var(--width-small);

  li {
    display: block;
  }

  i {
    color: var(--light-gray);
    margin-right: 5px;
    transition: color var(--fast) var(--transition);
  }

  button {
    display: flex;
    align-items: center;
    padding: 5px;
    color: var(--darker-gray);
    width: 100%;
    height: 100%;
    transition: color var(--fast) var(--transition);
    &:disabled,
    &[disabled] {
      color: var(--lighter-gray);
      i {
        color: var(--lighter-gray);
      }
    }
    &:not(:disabled):not(&[disabled]):hover {
      color: var(--accent);
      transition: none;
      i {
        color: var(--accent);
        transition: none;
      }
    }
  }
}

</style>