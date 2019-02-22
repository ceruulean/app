<template>
<draggable @start="startSort"
  @add="add(groupID)"
  @end="dragParent = false"
  :options="sortableOptions"
  :list="fields"
  @click="log"
  >
  <div class="row" v-for="field in fields" :key="field.field"
    @click="log"
    >
    <div class="drag"><i class="material-icons">drag_handle</i></div>
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
              @click.stop="warnRemoveField(field.field)"
            >
              <i class="material-icons">close</i> {{ $t("delete") }}
            </button>
          </li>
        </ul>
      </template>
    </v-popover>
  
    <settings-field-list v-if="field.children"
    :class="[
      'group',
      (field.children.length > 0? '' : 'empty' )
      ]"
    :groupID="field.id"
    :fields="field.children"
    @saveSort="saveSort"
    @warnRemoveField="warnRemoveField"
    @duplicateField="duplicateField"
    @startEditingField="startEditingField"
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
    sortableOptions(){
      return {
        group: { name: "a"
        },
        disabled: this.dragParent
        };
    },
    store(){ //SortableJS in VueDraggable
      return {
		/**
		 * Get the order of elements. Called once during initialization.
		 * @param   {Sortable}  sortable
		 * @returns {Array}
		 */
		get: function (sortable) {
			var order = localStorage.getItem(sortable.options.group.name);
			return order ? order.split('|') : [];
		},

		/**
		 * Save the order of elements. Called onEnd (when the item is dropped).
		 * @param {Sortable}  sortable
		 */
		set: function (sortable) {
			var order = sortable.toArray();
			localStorage.setItem(sortable.options.group.name, order.join('|'));
		    }
      }
    },
   fieldTree(){
      const fieldsArray = Object.values(this.fields);

      var [filtered, nonGroupFields] = this.$lodash.partition(fieldsArray,
         field => field.type.toLowerCase() === "group")

      var groupFields = filtered.map(group => ({
          ...group,
          children: []
        }));
      
    var groupedGroups = []

      nonGroupFields.forEach(field => {
        if (field.group != null) {
          const groupIndex = this.$lodash.findIndex(
            groupFields,
            group => group.id === field.group
          );
          return groupFields[groupIndex].children.push(field);
        }
          return groupedGroups.push(field);
      })

      groupFields.forEach((child, index) => {
        const groupIndex = this.$lodash.findIndex(
            groupFields,
            group2 => group2.id === child.group
          );
        if (groupIndex > -1) {
          groupFields[groupIndex].children.push(child);
        } else {
          groupedGroups.push(child);
        }
      });

        return groupedGroups;
    },
  },
  methods:{
    add(groupID) {
       this.saveSort(this.fields.map((field, index) => ({
        field : field.field,
        sort : index + 1,
        group : groupID
        }))
      );
    },
    expand(){
      alert("alert");
    },
    startSort(){
      this.dragParent = true;
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
    saveSort(receivedFields){
      console.log(receivedFields)
      this.$emit('saveSort', [...this.fields, ...receivedFields]);
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
      dragParent: false
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

  &.empty{
    padding-bottom:1em;
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
      &:not(.group):not(.drag):not(.more-options) {
        flex-basis: 200px;
      }
    }

    .inner{
    flex-grow: 1;

      > div {
        padding:0;
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

button {
  display: flex;
  align-items: center;
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

.more-options {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
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


  li{
  border: 1px solid black;
    -webkit-touch-callout: none; /* iOS Safari */
    -webkit-user-select: none; /* Safari */
     -khtml-user-select: none; /* Konqueror HTML */
       -moz-user-select: none; /* Firefox */
        -ms-user-select: none; /* Internet Explorer/Edge */
            user-select: none;
    padding:10px;
  }

  ul{
    padding:30px;
  }
</style>