import { mount } from '@vue/test-utils';
import deploy from './deploy.vue';
import { describe, it, expect, vi } from 'vitest';
import { nextTick } from 'vue';

describe('Deploy.vue', () => {
  it('renders the component with initial step', () => {
    const wrapper = mount(deploy, {
      props: {
        info: {
          index: true,
          name: 'test-app',
          dockerfileContent: '',
          dockerComposeContent: ''
        }
      }
    });
    expect(wrapper.find('.top-title').text()).toContain('应用管理 / 应用部署');
    expect(wrapper.find('el-button').text()).toBe('返回');
  });

  it('validates Dockerfile content', async () => {
    const wrapper = mount(deploy, {
      props: {
        info: {
          index: true,
          name: 'test-app',
          dockerfileContent: '',
          dockerComposeContent: ''
        }
      }
    });
    await wrapper.find('el-form-item[label="Dockerfile："]').trigger('blur');
    expect(wrapper.vm.rules.dockerfileContent[0].message).toBe('Dockerfile内容不能为空');
  });

  it('validates Docker Compose content', async () => {
    const wrapper = mount(deploy, {
      props: {
        info: {
          index: true,
          name: 'test-app',
          dockerfileContent: '',
          dockerComposeContent: ''
        }
      }
    });
    await wrapper.find('el-form-item[label="DockerCompose:"]').trigger('blur');
    expect(wrapper.vm.rules.dockerComposeContent[0].message).toBe('Docker Compose内容不能为空');
  });

  it('navigates to next step on valid form', async () => {
    const wrapper = mount(deploy, {
      props: {
        info: {
          index: true,
          name: 'test-app',
          dockerfileContent: 'FROM adoptopenjdk:8-jdk-hotspot',
          dockerComposeContent: 'services: test-app'
        }
      }
    });
    await wrapper.find('el-button[type="primary"]').trigger('click');
    expect(wrapper.vm.step).toBe(1);
  });

  it('navigates to previous step', async () => {
    const wrapper = mount(deploy, {
      props: {
        info: {
          index: true,
          name: 'test-app',
          dockerfileContent: 'FROM adoptopenjdk:8-jdk-hotspot',
          dockerComposeContent: 'services: test-app'
        }
      }
    });
    wrapper.vm.step = 1;
    await nextTick();
    await wrapper.find('el-button').trigger('click');
    expect(wrapper.vm.step).toBe(0);
  });

  it('fetches host list on activation', async () => {
    const fetchHostListMock = vi.fn();
    const wrapper = mount(deploy, {
      props: {
        info: {
          index: true,
          name: 'test-app',
          dockerfileContent: '',
          dockerComposeContent: ''
        }
      },
      global: {
        mocks: {
          fetchHostList: fetchHostListMock
        }
      }
    });
    await wrapper.vm.onActivated();
    expect(fetchHostListMock).toHaveBeenCalled();
  });

  it('generates default Dockerfile', () => {
    const wrapper = mount(deploy, {
      props: {
        info: {
          index: true,
          name: 'test-app',
          dockerfileContent: '',
          dockerComposeContent: ''
        }
      }
    });
    const defaultDockerfile = wrapper.vm.getDefaultDockerfile({});
    expect(defaultDockerfile).toContain('FROM adoptopenjdk:8-jdk-hotspot');
    expect(defaultDockerfile).toContain('test-app.jar');
  });

  it('generates default Docker Compose', () => {
    const wrapper = mount(deploy, {
      props: {
        info: {
          index: true,
          name: 'test-app',
          dockerfileContent: '',
          dockerComposeContent: ''
        }
      }
    });
    const defaultDockerCompose = wrapper.vm.getDefaultDockerCompose({});
    expect(defaultDockerCompose).toContain('services:');
    expect(defaultDockerCompose).toContain('test-app');
  });
});